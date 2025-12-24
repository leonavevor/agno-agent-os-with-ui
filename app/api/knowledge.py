"""
Enhanced Knowledge Base API
Provides additional features for knowledge management including search, filtering, and better error handling
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, File, Form
import json
from pathlib import Path
from app.config.upload import (
    is_extension_allowed,
    is_extension_blocked,
    is_mime_type_allowed,
    is_executable_content,
    get_max_size_for_extension,
    format_file_size,
    MAX_BATCH_SIZE,
    ALL_ALLOWED_EXTENSIONS,
)

router = APIRouter(prefix="/knowledge", tags=["Knowledge Management"])


def get_knowledge_storage_dir() -> Path:
    """Get or create the knowledge storage directory."""
    # Use a dedicated knowledge storage directory
    storage_dir = Path("./knowledge_storage")
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir


def get_agent_os(request: Request):
    """Get AgentOS instance from app state"""
    return request.app.state.agent_os


def validate_uploaded_file(file: UploadFile) -> tuple[bool, Optional[str]]:
    """
    Validate an uploaded file for security and size constraints.
    
    Returns:
        tuple: (is_valid, error_message)
    """
    # Get file extension
    file_path = Path(file.filename)
    extension = file_path.suffix.lower()
    
    # Check if extension is blocked
    if is_extension_blocked(extension):
        return False, f"File type blocked for security: {extension}. Executable and archive files are not allowed."
    
    # Check if extension is allowed
    if not is_extension_allowed(extension):
        allowed = ", ".join(sorted(list(ALL_ALLOWED_EXTENSIONS)[:20]))
        return False, f"File type not supported: {extension}. Allowed types include: {allowed}..."
    
    # Validate MIME type if available
    if file.content_type and not is_mime_type_allowed(file.content_type):
        return False, f"MIME type not allowed: {file.content_type}"
    
    return True, None


async def validate_file_content(file: UploadFile) -> tuple[bool, Optional[str], bytes]:
    """
    Validate file content for executable signatures and size.
    
    Returns:
        tuple: (is_valid, error_message, content)
    """
    # Read file content
    content = await file.read()
    
    # Reset file pointer for later use
    await file.seek(0)
    
    # Get file extension and max size
    file_path = Path(file.filename)
    extension = file_path.suffix.lower()
    max_size = get_max_size_for_extension(extension)
    
    # Check file size
    file_size = len(content)
    if file_size > max_size:
        return False, f"File too large: {format_file_size(file_size)}. Maximum for {extension}: {format_file_size(max_size)}", content
    
    # Check for executable content
    if is_executable_content(content):
        return False, "File contains executable code and cannot be uploaded for security reasons.", content
    
    return True, None, content


@router.get("/stats")
async def get_knowledge_stats(
    request: Request,
    db_id: Optional[str] = Query(None, description="Database ID to use"),
):
    """
    Get knowledge base statistics including counts by status
    """
    try:
        agent_os = get_agent_os(request)

        # Check if knowledge base is available
        if not hasattr(agent_os, "knowledge") or agent_os.knowledge is None:
            return {
                "total": 0,
                "completed": 0,
                "processing": 0,
                "pending": 0,
                "failed": 0,
                "total_size": 0,
                "total_access_count": 0,
                "message": "Knowledge base not configured",
            }

        # Get all knowledge items
        response = agent_os.knowledge.get_content(limit=1000, page=1, db_id=db_id)

        items = response.get("data", [])

        # Calculate statistics
        stats = {
            "total": len(items),
            "completed": len([i for i in items if i.get("status") == "completed"]),
            "processing": len([i for i in items if i.get("status") == "processing"]),
            "pending": len([i for i in items if i.get("status") == "pending"]),
            "failed": len([i for i in items if i.get("status") == "failed"]),
            "total_size": sum(int(i.get("size", 0) or 0) for i in items),
            "total_access_count": sum(
                int(i.get("access_count", 0) or 0) for i in items
            ),
        }

        return stats
    except Exception as e:
        # Return empty stats instead of error
        return {
            "total": 0,
            "completed": 0,
            "processing": 0,
            "pending": 0,
            "failed": 0,
            "total_size": 0,
            "total_access_count": 0,
            "error": str(e),
        }


@router.get("/search")
async def search_knowledge(
    request: Request,
    q: str = Query(..., description="Search query"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, description="Number of results to return"),
    page: int = Query(1, description="Page number"),
    db_id: Optional[str] = Query(None, description="Database ID to use"),
):
    """
    Search knowledge base by name, description, or content
    """
    try:
        agent_os = get_agent_os(request)

        # Check if knowledge base is available
        if not hasattr(agent_os, "knowledge") or agent_os.knowledge is None:
            return {
                "data": [],
                "meta": {
                    "page": page,
                    "limit": limit,
                    "total_pages": 0,
                    "total_count": 0,
                },
            }

        # Get all knowledge items (AgentOS will need to support filtering)
        response = agent_os.knowledge.get_content(
            limit=1000, page=1, db_id=db_id  # Get more items for client-side filtering
        )

        items = response.get("data", [])

        # Filter by search query
        query_lower = q.lower()
        filtered_items = [
            item
            for item in items
            if query_lower in item.get("name", "").lower()
            or query_lower in (item.get("description") or "").lower()
        ]

        # Filter by status if provided
        if status:
            filtered_items = [
                item for item in filtered_items if item.get("status") == status
            ]

        # Paginate results
        total = len(filtered_items)
        start = (page - 1) * limit
        end = start + limit
        paginated_items = filtered_items[start:end]

        return {
            "data": paginated_items,
            "meta": {
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit if total > 0 else 0,
                "total_count": total,
            },
        }
    except Exception as e:
        # Return empty results instead of error
        return {
            "data": [],
            "meta": {
                "page": page,
                "limit": limit,
                "total_pages": 0,
                "total_count": 0,
            },
            "error": str(e),
        }


@router.post("/retry/{content_id}")
async def retry_knowledge_processing(
    request: Request,
    content_id: str,
    db_id: Optional[str] = Query(None, description="Database ID to use"),
):
    """
    Retry processing a failed knowledge item
    """
    try:
        agent_os = get_agent_os(request)

        # Get the content item
        content = agent_os.knowledge.get_content_by_id(content_id, db_id=db_id)

        if not content:
            raise HTTPException(status_code=404, detail="Knowledge item not found")

        if content.get("status") != "failed":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot retry item with status: {content.get('status')}",
            )

        # Trigger reprocessing (this would need to be implemented in AgentOS)
        # For now, we'll return a message
        return {
            "message": "Retry functionality requires AgentOS enhancement",
            "content_id": content_id,
            "current_status": content.get("status"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retry failed: {str(e)}")


@router.put("/{content_id}/metadata")
async def update_knowledge_metadata(
    request: Request,
    content_id: str,
    metadata: dict,
    db_id: Optional[str] = Query(None, description="Database ID to use"),
):
    """
    Update metadata for a knowledge item
    """
    try:
        agent_os = get_agent_os(request)

        # This would need AgentOS support for metadata updates
        return {
            "message": "Metadata update functionality requires AgentOS enhancement",
            "content_id": content_id,
            "metadata": metadata,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.get("/health")
async def knowledge_health_check(request: Request):
    """
    Check knowledge base health and configuration
    """
    try:
        agent_os = get_agent_os(request)

        # Check if knowledge base is configured
        has_embedder = (
            hasattr(agent_os.knowledge, "embedder")
            if hasattr(agent_os, "knowledge")
            else False
        )

        # Try to get knowledge items
        try:
            response = agent_os.knowledge.get_content(limit=1, page=1)
            can_list = True
        except:
            can_list = False

        return {
            "status": "ok" if can_list else "degraded",
            "has_knowledge_base": hasattr(agent_os, "knowledge"),
            "has_embedder": has_embedder,
            "can_list_content": can_list,
            "message": (
                "Knowledge base is operational"
                if can_list
                else "Knowledge base may not be properly configured"
            ),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/upload-info")
async def get_upload_info():
    """
    Get information about allowed file types and size limits
    """
    from app.config.upload import (
        ALLOWED_EXTENSIONS,
        MAX_FILE_SIZE,
        MAX_DOCUMENT_SIZE,
        MAX_IMAGE_SIZE,
        MAX_AUDIO_SIZE,
        MAX_VIDEO_SIZE,
        MAX_CODE_SIZE,
        BLOCKED_EXTENSIONS as BLOCKED_EXT_LIST,
    )
    
    return {
        "allowed_extensions": {
            "documents": list(ALLOWED_EXTENSIONS["documents"]),
            "images": list(ALLOWED_EXTENSIONS["images"]),
            "audio": list(ALLOWED_EXTENSIONS["audio"]),
            "video": list(ALLOWED_EXTENSIONS["video"]),
            "code": list(ALLOWED_EXTENSIONS["code"]),
        },
        "blocked_extensions": list(BLOCKED_EXT_LIST),
        "size_limits": {
            "max_file_size": MAX_FILE_SIZE,
            "max_document_size": MAX_DOCUMENT_SIZE,
            "max_image_size": MAX_IMAGE_SIZE,
            "max_audio_size": MAX_AUDIO_SIZE,
            "max_video_size": MAX_VIDEO_SIZE,
            "max_code_size": MAX_CODE_SIZE,
            "max_batch_size": MAX_BATCH_SIZE,
        },
        "size_limits_formatted": {
            "max_file_size": format_file_size(MAX_FILE_SIZE),
            "max_document_size": format_file_size(MAX_DOCUMENT_SIZE),
            "max_image_size": format_file_size(MAX_IMAGE_SIZE),
            "max_audio_size": format_file_size(MAX_AUDIO_SIZE),
            "max_video_size": format_file_size(MAX_VIDEO_SIZE),
            "max_code_size": format_file_size(MAX_CODE_SIZE),
            "max_batch_size": format_file_size(MAX_BATCH_SIZE),
        }
    }


@router.post("/content/bulk")
async def bulk_upload_knowledge(
    request: Request,
    files: List[UploadFile] = File(...),
    relative_paths: Optional[str] = Form(None),
    descriptions: Optional[str] = Form(None),
    db_id: Optional[str] = Form(None),
):
    """
    Bulk upload multiple files (folder upload) to knowledge base.
    Preserves relative file paths as metadata for agent context.
    
    Args:
        files: List of files to upload
        relative_paths: JSON string of relative paths for each file
        descriptions: JSON string of descriptions for each file (optional)
        db_id: Database ID to use (optional)
    
    Returns:
        List of upload results with status for each file
    """
    try:
        agent_os = get_agent_os(request)
        
        # Check if knowledge base is available
        if not hasattr(agent_os, "knowledge") or agent_os.knowledge is None:
            raise HTTPException(
                status_code=503,
                detail="Knowledge base not configured"
            )
        
        # Parse relative paths from JSON
        paths_map = {}
        if relative_paths:
            try:
                paths_map = json.loads(relative_paths)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid relative_paths JSON format"
                )
        
        # Parse descriptions from JSON
        descriptions_map = {}
        if descriptions:
            try:
                descriptions_map = json.loads(descriptions)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid descriptions JSON format"
                )
        
        results = []
        storage_dir = get_knowledge_storage_dir()
        total_size = 0
        
        # Process each file
        for idx, uploaded_file in enumerate(files):
            try:
                # Validate file type and extension
                is_valid, error_msg = validate_uploaded_file(uploaded_file)
                if not is_valid:
                    results.append({
                        "filename": uploaded_file.filename,
                        "relative_path": paths_map.get(str(idx), uploaded_file.filename),
                        "status": "error",
                        "message": error_msg
                    })
                    continue
                
                # Validate file content and size
                is_content_valid, content_error, content = await validate_file_content(uploaded_file)
                if not is_content_valid:
                    results.append({
                        "filename": uploaded_file.filename,
                        "relative_path": paths_map.get(str(idx), uploaded_file.filename),
                        "status": "error",
                        "message": content_error
                    })
                    continue
                
                # Check total batch size
                total_size += len(content)
                if total_size > MAX_BATCH_SIZE:
                    results.append({
                        "filename": uploaded_file.filename,
                        "relative_path": paths_map.get(str(idx), uploaded_file.filename),
                        "status": "error",
                        "message": f"Total upload size exceeds maximum {format_file_size(MAX_BATCH_SIZE)}"
                    })
                    continue
                
                # Get relative path for this file
                relative_path = paths_map.get(str(idx), uploaded_file.filename)
                description = descriptions_map.get(str(idx), f"Uploaded from folder: {relative_path}")
                
                # Create the full path maintaining folder structure
                file_storage_path = storage_dir / relative_path
                
                # Create parent directories if they don't exist
                file_storage_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Save file content to persistent storage
                with open(file_storage_path, 'wb') as f:
                    f.write(content)
                
                # Prepare metadata with relative path information
                metadata = {
                    "original_filename": uploaded_file.filename,
                    "relative_path": relative_path,
                    "storage_path": str(file_storage_path),
                    "content_type": uploaded_file.content_type,
                    "size": len(content),
                    "upload_type": "bulk_folder"
                }
                
                # Add content to knowledge base using the persistent path
                try:
                    response = agent_os.knowledge.add_content(
                        name=relative_path,  # Use relative path as name for context
                        path=str(file_storage_path),  # Use persistent path
                        description=description,
                        metadata=metadata,
                        db_id=db_id
                    )
                    
                    results.append({
                        "filename": uploaded_file.filename,
                        "relative_path": relative_path,
                        "storage_path": str(file_storage_path),
                        "status": "success",
                        "content_id": response.get("id") if response else None,
                        "message": f"Successfully uploaded {relative_path}"
                    })
                    
                except Exception as e:
                    # Clean up file if knowledge base add failed
                    try:
                        file_storage_path.unlink()
                    except:
                        pass
                    results.append({
                        "filename": uploaded_file.filename,
                        "relative_path": relative_path,
                        "status": "error",
                        "message": f"Failed to add to knowledge base: {str(e)}"
                    })
                    
            except Exception as e:
                results.append({
                    "filename": uploaded_file.filename,
                    "relative_path": paths_map.get(str(idx), uploaded_file.filename),
                    "status": "error",
                    "message": f"Failed to process file: {str(e)}"
                })
        
        # Calculate summary
        success_count = len([r for r in results if r["status"] == "success"])
        error_count = len([r for r in results if r["status"] == "error"])
        
        return {
            "summary": {
                "total": len(files),
                "success": success_count,
                "failed": error_count
            },
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Bulk upload failed: {str(e)}"
        )

