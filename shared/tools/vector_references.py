"""Vector-powered reference search using pgvector for semantic RAG."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import List, Optional

from agno.tools import tool
from sqlalchemy import Column, Integer, String, Text, create_engine
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import text

from db.url import get_db_url

Base = declarative_base()


class ReferenceDocument(Base):
    """Embedded reference document with vector similarity search."""

    __tablename__ = "reference_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    skill_id = Column(String(255), nullable=False, index=True)
    file_path = Column(Text, nullable=False)
    content_hash = Column(String(64), nullable=False, unique=True)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, default=0)
    # pgvector column - will be added via migration
    # embedding = Column(Vector(1536))  # OpenAI ada-002 dimension


class VectorReferenceStore:
    """Manages vector embeddings for skill references using pgvector."""

    def __init__(
        self,
        database_url: Optional[str] = None,
        embedding_model: str = "text-embedding-3-small",
    ) -> None:
        url = database_url or get_db_url()
        self.engine = create_engine(url, pool_pre_ping=True)
        self.SessionLocal = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.embedding_model = embedding_model

        # Create tables and enable pgvector extension
        self._initialize_database()

    def _initialize_database(self) -> None:
        """Create tables and enable pgvector extension."""
        with self.engine.connect() as conn:
            # Enable pgvector extension
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()

        Base.metadata.create_all(self.engine)

        # Add embedding column if not exists (migration-friendly)
        with self.engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='reference_documents' AND column_name='embedding'
            """
                )
            )
            if not result.fetchone():
                conn.execute(
                    text(
                        "ALTER TABLE reference_documents ADD COLUMN embedding vector(1536)"
                    )
                )
                # Create HNSW index for fast similarity search
                conn.execute(
                    text(
                        """
                    CREATE INDEX IF NOT EXISTS reference_documents_embedding_idx 
                    ON reference_documents USING hnsw (embedding vector_cosine_ops)
                """
                    )
                )
                conn.commit()

    def embed_references(
        self,
        skill_id: str,
        reference_paths: List[Path],
        chunk_size: int = 1000,
    ) -> int:
        """
        Embed reference documents for a skill with chunking.

        Returns:
            Number of new chunks indexed
        """
        from agno.embedder.openai import OpenAIEmbedder

        embedder = OpenAIEmbedder(model=self.embedding_model)
        new_chunks = 0

        with self.SessionLocal() as session:
            for path in reference_paths:
                if not path.exists() or not path.is_file():
                    continue

                content = path.read_text(encoding="utf-8")
                content_hash = hashlib.sha256(content.encode()).hexdigest()

                # Check if already indexed
                existing = (
                    session.query(ReferenceDocument)
                    .filter(ReferenceDocument.content_hash == content_hash)
                    .first()
                )
                if existing:
                    continue

                # Chunk content for embedding
                chunks = self._chunk_text(content, chunk_size)

                for idx, chunk in enumerate(chunks):
                    # Generate embedding
                    embedding_result = embedder.get_embedding(chunk)
                    embedding_vector = embedding_result.data[0].embedding

                    # Store with vector
                    doc = ReferenceDocument(
                        skill_id=skill_id,
                        file_path=str(path),
                        content_hash=f"{content_hash}_{idx}",
                        content=chunk,
                        chunk_index=idx,
                    )
                    session.add(doc)
                    session.flush()

                    # Update embedding column via raw SQL (pgvector compatibility)
                    session.execute(
                        text(
                            """
                        UPDATE reference_documents 
                        SET embedding = :embedding::vector 
                        WHERE id = :doc_id
                    """
                        ),
                        {"embedding": str(embedding_vector), "doc_id": doc.id},
                    )
                    new_chunks += 1

            session.commit()

        return new_chunks

    def search(
        self,
        query: str,
        skill_id: Optional[str] = None,
        limit: int = 5,
    ) -> List[dict]:
        """
        Semantic search across reference documents.

        Args:
            query: Search query
            skill_id: Optional skill filter
            limit: Maximum results to return

        Returns:
            List of matched documents with similarity scores
        """
        from agno.embedder.openai import OpenAIEmbedder

        embedder = OpenAIEmbedder(model=self.embedding_model)
        query_embedding = embedder.get_embedding(query).data[0].embedding

        with self.SessionLocal() as session:
            # Build similarity query
            sql = """
                SELECT 
                    skill_id,
                    file_path,
                    content,
                    chunk_index,
                    1 - (embedding <=> :query_embedding::vector) as similarity
                FROM reference_documents
            """
            params = {"query_embedding": str(query_embedding), "limit": limit}

            if skill_id:
                sql += " WHERE skill_id = :skill_id"
                params["skill_id"] = skill_id

            sql += " ORDER BY embedding <=> :query_embedding::vector LIMIT :limit"

            result = session.execute(text(sql), params)

            return [
                {
                    "skill_id": row[0],
                    "file_path": row[1],
                    "content": row[2],
                    "chunk_index": row[3],
                    "similarity": float(row[4]),
                }
                for row in result
            ]

    @staticmethod
    def _chunk_text(text: str, chunk_size: int) -> List[str]:
        """Split text into overlapping chunks."""
        chunks = []
        overlap = chunk_size // 4

        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i : i + chunk_size]
            if chunk.strip():
                chunks.append(chunk)

        return chunks


# Singleton instance
_vector_store: Optional[VectorReferenceStore] = None


def get_vector_store() -> VectorReferenceStore:
    """Get or create singleton vector store."""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorReferenceStore()
    return _vector_store


@tool
def search_skill_references_vector(
    agent,
    query: str,
    skill_id: str | None = None,
    limit: int = 3,
) -> str:
    """
    Semantic search across skill reference documents using vector embeddings.

    This tool performs intelligent similarity matching rather than keyword search,
    allowing you to find conceptually relevant information even when exact terms differ.

    Args:
        query: Natural language search query
        skill_id: Optional skill filter (searches all skills if omitted)
        limit: Maximum number of results (default: 3)

    Returns:
        Formatted search results with similarity scores and citations
    """
    store = get_vector_store()
    results = store.search(query, skill_id=skill_id, limit=limit)

    if not results:
        return "No relevant references found for your query."

    formatted_results = [
        f"**Result {i+1}** (similarity: {r['similarity']:.2f})\n"
        f"Source: {Path(r['file_path']).name}\n"
        f"Content:\n{r['content'][:500]}...\n"
        for i, r in enumerate(results)
    ]

    return "\n---\n".join(formatted_results)
