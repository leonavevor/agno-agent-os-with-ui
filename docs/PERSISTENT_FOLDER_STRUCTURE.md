# Persistent Folder Structure - Update Summary

## 🎯 Enhancement Overview

Updated the folder upload feature to **maintain and persist the actual folder structure on disk**, not just as metadata. Files are now saved to `./knowledge_storage/` maintaining their exact directory hierarchy.

## ✨ What Changed

### Previous Behavior
- Files uploaded to temporary locations
- Folder structure only existed in metadata
- Files could be lost on restart
- No direct filesystem access

### New Behavior
- ✅ Files saved to persistent `knowledge_storage/` directory
- ✅ Exact folder hierarchy maintained on disk
- ✅ Files persist across server restarts
- ✅ Direct filesystem access by path
- ✅ Easy backup and restore
- ✅ Simple navigation and browsing

## 📁 Storage Structure

### Directory Layout
```
knowledge_storage/
├── project-a/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── utils/
│   │       └── helpers.ts
│   └── docs/
│       ├── README.md
│       └── API.md
└── project-b/
    ├── main.py
    └── requirements.txt
```

### File Properties
- **Location**: `./knowledge_storage/{relative_path}`
- **Persistence**: Permanent (not temporary)
- **Structure**: Exact folder hierarchy preserved
- **Access**: Direct file path access

## 🔧 Technical Changes

### Backend Updates

**File**: `app/api/knowledge.py`

1. **New Storage Function**
```python
def get_knowledge_storage_dir() -> Path:
    """Get or create the knowledge storage directory."""
    storage_dir = Path("./knowledge_storage")
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir
```

2. **Updated Upload Logic**
```python
# Create directory structure
file_storage_path = storage_dir / relative_path
file_storage_path.parent.mkdir(parents=True, exist_ok=True)

# Save file permanently
with open(file_storage_path, 'wb') as f:
    f.write(content)

# Use persistent path in knowledge base
agent_os.knowledge.add_content(
    name=relative_path,
    path=str(file_storage_path),  # Persistent path
    metadata={"storage_path": str(file_storage_path), ...}
)
```

3. **Enhanced Metadata**
```json
{
  "original_filename": "example.txt",
  "relative_path": "docs/examples/example.txt",
  "storage_path": "./knowledge_storage/docs/examples/example.txt",
  "content_type": "text/plain",
  "size": 1234,
  "upload_type": "bulk_folder"
}
```

### Docker Integration

**File**: `compose.yaml`

Added persistent volume:
```yaml
services:
  agno-backend-api:
    volumes:
      - knowledge_storage:/app/knowledge_storage

volumes:
  knowledge_storage:  # Named volume for persistence
```

### Configuration

**File**: `.gitignore`

Added storage directory:
```gitignore
# Knowledge storage - uploaded files with folder structure
knowledge_storage/
```

## 📚 Documentation Updates

### New Files
1. **`knowledge_storage/README.md`**
   - Storage directory documentation
   - File management guide
   - Backup and security instructions

2. **Updated Guides**
   - `docs/FOLDER_UPLOAD_GUIDE.md` - Added storage architecture section
   - `docs/FOLDER_UPLOAD_IMPLEMENTATION.md` - Updated technical details
   - `docs/FOLDER_UPLOAD_QUICKREF.md` - Added file access examples

## 💡 Benefits

### For Users
- 📂 Browse files directly in filesystem
- 💾 Files persist permanently
- 🔄 Easy backup/restore
- 🔍 Simple file discovery

### For Agents
- 🎯 Access files by actual path
- 📊 Better context understanding
- 🔗 File relationship awareness
- 🗺️ Navigate folder structure programmatically

### For Developers
- 🛠️ Direct file manipulation
- 🐛 Easier debugging
- 📁 Clear organization
- 🔒 Standard filesystem operations

## 🚀 Usage Examples

### Direct File Access
```python
from pathlib import Path

# Read file directly
storage_dir = Path("./knowledge_storage")
file_path = storage_dir / "docs/API.md"
content = file_path.read_text()
```

### Via Knowledge Base
```python
# Get from knowledge base
content = agent_os.knowledge.get_content_by_id(content_id)
storage_path = Path(content.metadata["storage_path"])
relative_path = content.metadata["relative_path"]

# Read file
with open(storage_path, 'r') as f:
    data = f.read()
```

### Backup/Restore
```bash
# Backup
tar -czf knowledge_backup.tar.gz knowledge_storage/

# Restore
tar -xzf knowledge_backup.tar.gz
```

## 🐳 Docker Deployment

### Volume Configuration
The knowledge storage is now a named Docker volume, ensuring persistence:

```yaml
# compose.yaml
volumes:
  knowledge_storage:/app/knowledge_storage
```

### Backup in Docker
```bash
# Create backup
docker-compose exec agno-backend-api tar -czf /tmp/backup.tar.gz knowledge_storage/
docker cp agno-backend-api:/tmp/backup.tar.gz ./backups/

# Restore
docker cp ./backups/backup.tar.gz agno-backend-api:/tmp/
docker-compose exec agno-backend-api tar -xzf /tmp/backup.tar.gz
```

## 🔍 Migration Guide

### Existing Deployments

If you have existing deployments, no migration is needed:
- New uploads will use persistent storage automatically
- Existing knowledge base entries remain functional
- Old temporary files can be cleaned up manually

### Fresh Deployments

1. Pull latest code
2. Run `docker-compose up`
3. Volume will be created automatically
4. Upload folders normally

## 🎓 Best Practices

1. **Regular Backups**
   ```bash
   # Daily backup cron job
   0 2 * * * tar -czf ~/backups/knowledge_$(date +\%Y\%m\%d).tar.gz knowledge_storage/
   ```

2. **Monitor Disk Space**
   ```bash
   # Check storage size
   du -sh knowledge_storage/
   
   # Check disk usage
   df -h
   ```

3. **Cleanup Old Files**
   ```bash
   # Find files older than 90 days
   find knowledge_storage -type f -mtime +90
   ```

4. **Volume Inspection**
   ```bash
   # List Docker volumes
   docker volume ls
   
   # Inspect volume
   docker volume inspect agent-infra-docker_knowledge_storage
   ```

## ⚠️ Important Notes

### Disk Space
- Monitor available disk space regularly
- Implement retention policies for large deployments
- Consider cleanup automation

### Security
- Ensure proper file permissions
- Validate file paths to prevent traversal attacks
- Backup sensitive data securely

### Performance
- Large folder uploads may take time
- SSD storage recommended for better performance
- Consider compression for archival

## 📊 File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `app/api/knowledge.py` | Modified | Added persistent storage logic |
| `compose.yaml` | Modified | Added knowledge_storage volume |
| `.gitignore` | Modified | Added knowledge_storage entry |
| `knowledge_storage/README.md` | Created | Storage directory documentation |
| `docs/FOLDER_UPLOAD_GUIDE.md` | Updated | Added storage architecture |
| `docs/FOLDER_UPLOAD_IMPLEMENTATION.md` | Updated | Updated technical details |
| `docs/FOLDER_UPLOAD_QUICKREF.md` | Updated | Added file access examples |

## 🎉 Conclusion

The folder upload feature now provides complete persistence of uploaded files with their folder structure maintained on disk. This enhancement makes the knowledge base more robust, easier to manage, and provides better context for agents.

**Key Achievements:**
- ✅ Persistent folder structure on disk
- ✅ Direct filesystem access
- ✅ Easy backup and restore
- ✅ Docker volume integration
- ✅ Comprehensive documentation
- ✅ Backward compatible

## 📖 Related Documentation

- [knowledge_storage/README.md](../knowledge_storage/README.md) - Storage directory guide
- [FOLDER_UPLOAD_GUIDE.md](./FOLDER_UPLOAD_GUIDE.md) - Complete user guide
- [FOLDER_UPLOAD_QUICKREF.md](./FOLDER_UPLOAD_QUICKREF.md) - Quick reference
- [DOCKER_INTEGRATION.md](./DOCKER_INTEGRATION.md) - Docker setup guide
