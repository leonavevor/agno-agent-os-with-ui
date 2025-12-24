# Folder Upload - Quick Reference

## 🚀 Quick Start

### UI Upload
1. Open Knowledge panel
2. Toggle to **"Folder"** mode
3. Click **"Upload Folder"**
4. Select directory
5. Done! Files uploaded **with folder structure preserved on disk**

### Check Upload Results
- 📁 icon = folder upload
- Click file → View metadata
- See "relative_path" and "storage_path" in metadata
- Files stored in `./knowledge_storage/` directory

## 📁 Storage Structure

Files are saved to disk maintaining folder hierarchy:

```
knowledge_storage/
├── project-a/
│   ├── src/
│   │   └── main.py
│   └── docs/
│       └── README.md
└── project-b/
    └── app.js
```

## 🔌 API Endpoints

### Bulk Upload
```
POST /knowledge/content/bulk
```

**Form Data:**
- `files`: Multiple file uploads
- `relative_paths`: JSON {"0": "path/file.txt", ...}
- `descriptions`: (Optional) JSON {"0": "description", ...}

### Single Upload (existing)
```
POST /knowledge/content
```

## 📦 Metadata Structure

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

## 🗄️ File Access

### Python
```python
from pathlib import Path

# Direct file access
storage_dir = Path("./knowledge_storage")
file_path = storage_dir / "docs/examples/example.txt"
content = file_path.read_text()

# Via metadata
content = agent_os.knowledge.get_content_by_id(id)
storage_path = content.metadata.get('storage_path')
relative_path = content.metadata.get('relative_path')
```

## 💻 Code Examples

### TypeScript/Frontend
```typescript
import { bulkUploadKnowledge } from '@/api/advanced'

const files = Array.from(input.files)
const paths = {}
files.forEach((file, i) => {
  paths[i] = file.webkitRelativePath || file.name
})

await bulkUploadKnowledge(endpoint, files, paths, undefined, authToken)
```

### Python/Backend
```python
# Access in agent
content = agent_os.knowledge.get_content_by_id(id)
path = content.metadata.get('relative_path')
is_folder_upload = content.metadata.get('upload_type') == 'bulk_folder'
```

### cURL
```bash
curl -X POST http://localhost:7777/knowledge/content/bulk \
  -F "files=@file1.txt" \
  -F "files=@file2.txt" \
  -F 'relative_paths={"0":"dir/file1.txt","1":"dir/file2.txt"}'
```

## 🎯 Key Files Modified

| File | Purpose |
|------|---------|
| `app/api/knowledge.py` | Backend endpoint |
| `agno-ui/src/api/advanced.ts` | API client |
| `agno-ui/src/components/chat/Sidebar/KnowledgeUpload.tsx` | UI component |
| `agno-ui/src/api/routes.ts` | Route definitions |

## ✅ Browser Support

- Chrome ✅
- Firefox ✅  
- Safari ✅
- Edge ✅

## 🔍 Agent Query Examples

**With folder metadata:**
```
"Show me files in src/components/"
"Analyze the API documentation in docs/api/"
"Find all Python files in the tests directory"
```

## 📚 Full Documentation

- [FOLDER_UPLOAD_GUIDE.md](./FOLDER_UPLOAD_GUIDE.md) - Complete guide
- [FOLDER_UPLOAD_IMPLEMENTATION.md](./FOLDER_UPLOAD_IMPLEMENTATION.md) - Technical details
