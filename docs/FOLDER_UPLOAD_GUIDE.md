# Folder Upload Guide

## Overview

The knowledge base now supports bulk folder uploads while preserving the complete folder structure as metadata. This enables agents to understand the context and relationships between files based on their original directory organization.

## Features

### 1. Folder Structure Preservation
- Upload entire directories at once
- **Physical folder structure is maintained in storage**
- Files are saved to `knowledge_storage/` with exact folder hierarchy
- Relative file paths are stored in metadata for easy reference
- Agents can access file path information for context

### 2. Persistent Storage
- Files are stored permanently in `./knowledge_storage/` directory
- Folder structure is preserved exactly as uploaded
- Files persist across server restarts
- Easy to backup and restore
- Simple filesystem navigation

### 3. Metadata Enhancement
When files are uploaded as part of a folder, the following metadata is automatically attached:

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

### 3. Agent Context Benefits

Agents can now:
- Understand file organization and hierarchy
- Reference files by their original paths (stored on disk)
- Access the actual file in its folder location
- Identify related files from the same directory
- Maintain context about file relationships
- Navigate the folder structure programmatically

## Storage Architecture

### Directory Structure

Uploaded files are stored in `./knowledge_storage/` maintaining their exact folder hierarchy:

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
│       └── README.md
└── project-b/
    ├── main.py
    └── requirements.txt
```

### Storage Benefits

1. **Persistence**: Files remain even after server restarts
2. **Navigation**: Easy to browse files manually
3. **Backup**: Simple directory backup/restore
4. **Access**: Direct file access by path
5. **Organization**: Clear structure for multiple projects

## Usage

### Frontend (UI)

1. **Toggle Upload Mode**
   - Switch between "Files" and "Folder" modes
   - Files mode: Upload individual files (original behavior)
   - Folder mode: Upload entire directories

2. **Upload a Folder**
   - Click "Upload Folder" button
   - Select a directory in the file picker
   - All files within the directory will be uploaded with preserved paths

3. **View Metadata**
   - Click on any uploaded file to view details
   - Folder uploads are marked with a 📁 icon
   - Metadata section shows the complete relative path
   - "Folder Upload" label indicates bulk upload type

### Backend API

#### Bulk Upload Endpoint

**POST** `/knowledge/content/bulk`

**Parameters:**
- `files`: List of file uploads (multipart/form-data)
- `relative_paths`: JSON string mapping file indices to their relative paths
- `descriptions`: (Optional) JSON string mapping file indices to descriptions
- `db_id`: (Optional) Database ID to use

**Example Request:**

```python
import requests

files = [
    ('files', open('docs/readme.md', 'rb')),
    ('files', open('docs/guide.md', 'rb')),
]

data = {
    'relative_paths': json.dumps({
        '0': 'docs/readme.md',
        '1': 'docs/guide.md'
    })
}

response = requests.post(
    'http://localhost:7777/knowledge/content/bulk',
    files=files,
    data=data
)
```

**Response:**

```json
{
  "summary": {
    "total": 2,
    "success": 2,
    "failed": 0
  },
  "results": [
    {
      "filename": "readme.md",
      "relative_path": "docs/readme.md",
      "status": "success",
      "content_id": "abc123",
      "message": "Successfully uploaded docs/readme.md"
    },
    {
      "filename": "guide.md",
      "relative_path": "docs/guide.md",
      "status": "success",
      "content_id": "def456",
      "message": "Successfully uploaded docs/guide.md"
    }
  ]
}
```

### TypeScript/JavaScript Client

```typescript
import { bulkUploadKnowledge } from '@/api/advanced'

// Prepare files and paths
const files = Array.from(fileInputElement.files)
const relativePaths: Record<string, string> = {}

files.forEach((file, index) => {
  // Extract from webkitRelativePath for folder uploads
  const relativePath = file.webkitRelativePath || file.name
  relativePaths[index.toString()] = relativePath
})

// Upload with preserved paths
const result = await bulkUploadKnowledge(
  endpoint,
  files,
  relativePaths,
  undefined, // optional descriptions
  authToken
)

console.log(`Uploaded ${result.summary.success} of ${result.summary.total} files`)
```

## Agent Integration

### Accessing File Metadata

Agents can retrieve file metadata from the knowledge base:

```python
# Get knowledge content with metadata
content = agent_os.knowledge.get_content_by_id(content_id)

# Access relative path
relative_path = content.metadata.get('relative_path')
upload_type = content.metadata.get('upload_type')

if upload_type == 'bulk_folder':
    print(f"File location: {relative_path}")
```

### Example Agent Use Cases

1. **Code Repository Analysis**
   ```
   Upload: /src, /tests, /docs folders
   Agent can understand: "Analyze all test files in tests/ directory"
   ```

2. **Documentation Organization**
   ```
   Upload: /docs/api, /docs/guides folders
   Agent can reference: "Check the API documentation in docs/api/"
   ```

3. **Multi-language Projects**
   ```
   Upload: /translations folder with en/, es/, fr/ subdirectories
   Agent understands: "Show Spanish translations" → searches translations/es/
   ```

## Implementation Details

### Backend (FastAPI)

- **Endpoint**: `app/api/knowledge.py::bulk_upload_knowledge()`
- **Storage**: Files saved to `./knowledge_storage/` with folder structure preserved
- **Processing**: Each file is saved to its relative path location
- **Metadata**: Relative paths and storage paths are attached to each document

**Storage Process:**
1. Receive uploaded files with relative paths
2. Create `knowledge_storage/{relative_path}` structure
3. Save file content to disk maintaining folders
4. Add file reference to knowledge base
5. Store both relative and absolute paths in metadata

### Frontend (React)

- **Component**: `agno-ui/src/components/chat/Sidebar/KnowledgeUpload.tsx`
- **File Input**: Uses `webkitdirectory` attribute for folder selection
- **Path Extraction**: Reads `webkitRelativePath` property from File objects

### API Client

- **Module**: `agno-ui/src/api/advanced.ts`
- **Function**: `bulkUploadKnowledge()`
- **Data Format**: Uses FormData with JSON-encoded path mappings

## Browser Compatibility

The folder upload feature uses the `webkitdirectory` attribute which is supported in:

- ✅ Chrome/Edge (all versions)
- ✅ Firefox 50+
- ✅ Safari 11.1+
- ✅ Opera 38+

## Best Practices

1. **Organize Files Before Upload**
   - Structure your folders logically before uploading
   - Use meaningful directory names
   - Keep related files together

2. **File Naming**
   - Use descriptive file names
   - Avoid special characters in paths
   - Maintain consistent naming conventions

3. **Metadata Usage**
   - Reference files by their relative paths in agent prompts
   - Use folder structure to provide context
   - Group related queries by directory

4. **Storage Management**
   - Monitor disk space usage regularly
   - Implement cleanup policies for unused files
   - Backup `knowledge_storage/` directory periodically
   - Use Docker volumes for production deployments

5. **Performance Considerations**
   - Large folders may take time to upload
   - Consider breaking very large uploads into smaller batches
   - Monitor upload progress via toast notifications

## Docker Deployment

### Volume Configuration

Ensure the knowledge storage persists across container restarts:

```yaml
# compose.yaml
services:
  backend:
    volumes:
      - ./knowledge_storage:/app/knowledge_storage
```

### Backup Strategy

```bash
# Create backup
docker-compose exec backend tar -czf /tmp/knowledge_backup.tar.gz knowledge_storage/
docker cp backend:/tmp/knowledge_backup.tar.gz ./backups/

# Restore backup
docker cp ./backups/knowledge_backup.tar.gz backend:/tmp/
docker-compose exec backend tar -xzf /tmp/knowledge_backup.tar.gz
```

## Troubleshooting

### Issue: Folder Upload Not Working

**Solution**: Ensure your browser supports the `webkitdirectory` attribute. Try updating to the latest browser version.

### Issue: Relative Paths Not Preserved

**Solution**: Check that files have the `webkitRelativePath` property. This is only available when using folder selection.

### Issue: Upload Fails for Some Files

**Solution**: Check the response's `results` array for specific error messages. Common issues:
- File type not supported
- File size too large
- Knowledge base not configured

### Issue: Metadata Not Visible

**Solution**: Click on individual files in the knowledge list to view detailed metadata in the dialog.

## Future Enhancements

Potential improvements to the folder upload feature:

- [ ] Drag-and-drop folder support
- [ ] Progress bar for large folder uploads
- [ ] Filter and exclude patterns (e.g., ignore node_modules)
- [ ] Folder tree visualization in UI
- [ ] Batch update/delete by folder
- [ ] Search/filter by folder path
- [ ] Export folder structure as JSON

## Related Documentation

- [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) - General knowledge base documentation
- [MEMORY_IMPLEMENTATION_SUMMARY.md](./MEMORY_IMPLEMENTATION_SUMMARY.md) - Memory and context management
- [FRONTEND_BACKEND_INTEGRATION.md](./FRONTEND_BACKEND_INTEGRATION.md) - API integration guide
