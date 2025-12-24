# Folder Upload Feature - Implementation Summary

## Overview

Implemented comprehensive folder upload support for the knowledge base, enabling bulk file uploads while **preserving and persisting the complete folder structure to disk**. Files are stored in `./knowledge_storage/` maintaining their exact directory hierarchy, allowing agents to understand file relationships and access files by their original paths.

## Key Features

### 1. **Persistent Folder Structure**
- **Location**: `./knowledge_storage/` directory
- **Structure**: Exact folder hierarchy is maintained
- **Persistence**: Files remain across server restarts
- **Navigation**: Easy filesystem browsing and access

### 2. **Bulk Upload API Endpoint**
- **Location**: `app/api/knowledge.py`
- **Route**: `POST /knowledge/content/bulk`
- **Functionality**:
  - Accepts multiple files in a single request
  - Creates directory structure on disk
  - Saves files to their relative paths
  - Preserves relative file paths as metadata
  - Returns detailed results for each file upload
  - Provides summary statistics (total, success, failed)

### 2. **Frontend Folder Selection**
- **Location**: `agno-ui/src/components/chat/Sidebar/KnowledgeUpload.tsx`
- **Features**:
  - Toggle between Files and Folder upload modes
  - Uses browser's native folder picker (`webkitdirectory`)
  - Visual indicators for folder-uploaded items (📁 icon)
  - Displays relative paths in file listings
  - Enhanced metadata display in detail dialog

### 3. **API Client Enhancement**
- **Location**: `agno-ui/src/api/advanced.ts`
- **New Function**: `bulkUploadKnowledge()`
- **Capabilities**:
  - Handles multiple files with path mapping
  - Converts relative paths to JSON for API
  - Provides user feedback via toast notifications
  - Returns detailed upload results

## Technical Implementation

### Backend Changes

#### New Endpoint: `/knowledge/content/bulk`

**Request Parameters:**
```typescript
{
  files: File[],              // Array of files to upload
  relative_paths: string,     // JSON string: {"0": "path/to/file1.txt", "1": "path/to/file2.txt"}
  descriptions?: string,      // JSON string: Optional descriptions per file
  db_id?: string             // Optional database ID
}
```

**Response:**
```typescript
{
  summary: {
    total: number,
    success: number,
    failed: number
  },
  results: Array<{
    filename: string,
    relative_path: string,
    status: 'success' | 'error',
    content_id?: string,
    message: string
  }>
}
```

**Metadata Structure:**
Each uploaded file includes:
```json
{
  "original_filename": "example.txt",
  "relative_path": "docs/examples/example.txt",
  "content_type": "text/plain",
  "size": 1234,
  "upload_type": "bulk_folder"
}
```

### Frontend Changes

#### Component Updates (`KnowledgeUpload.tsx`)

**New State:**
```typescript
const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files')
const folderInputRef = useRef<HTMLInputElement>(null)
```

**New Handler:**
```typescript
const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  // Extracts webkitRelativePath from each file
  // Calls bulkUploadKnowledge API
}
```

**UI Enhancements:**
- Mode toggle buttons (Files/Folder)
- Folder icon display for bulk uploads
- Relative path display in file list
- Metadata highlighting in detail dialog

#### API Client Updates (`advanced.ts`)

**New Types:**
```typescript
interface BulkUploadResult {
  filename: string
  relative_path: string
  status: 'success' | 'error'
  content_id?: string
  message: string
}

interface BulkUploadResponse {
  summary: {
    total: number
    success: number
    failed: number
  }
  results: BulkUploadResult[]
}
```

**New Function:**
```typescript
bulkUploadKnowledge(
  endpoint: string,
  files: File[],
  relativePaths: Record<string, string>,
  descriptions?: Record<string, string>,
  authToken?: string
): Promise<BulkUploadResponse>
```

## File Changes Summary

| File | Changes | Lines Added |
|------|---------|-------------|
| `app/api/knowledge.py` | Added bulk upload endpoint | ~160 |
| `agno-ui/src/api/routes.ts` | Added BulkUploadKnowledge route | ~1 |
| `agno-ui/src/api/advanced.ts` | Added bulk upload function & types | ~60 |
| `agno-ui/src/components/chat/Sidebar/KnowledgeUpload.tsx` | Added folder upload UI | ~50 |
| `docs/FOLDER_UPLOAD_GUIDE.md` | Comprehensive documentation | ~350 |

## Usage Examples

### 1. Frontend Usage

```typescript
// User selects a folder via the UI
// handleFolderSelect is automatically called
// Files are uploaded with preserved paths
```

### 2. Direct API Usage

```typescript
import { bulkUploadKnowledge } from '@/api/advanced'

const files = [file1, file2, file3]
const paths = {
  '0': 'src/components/App.tsx',
  '1': 'src/components/Header.tsx',
  '2': 'src/utils/helpers.ts'
}

const result = await bulkUploadKnowledge(
  'http://localhost:7777',
  files,
  paths,
  undefined,
  authToken
)

console.log(`Success: ${result.summary.success}/${result.summary.total}`)
```

### 3. Backend API Call

```bash
curl -X POST http://localhost:7777/knowledge/content/bulk \
  -F "files=@docs/readme.md" \
  -F "files=@docs/guide.md" \
  -F 'relative_paths={"0":"docs/readme.md","1":"docs/guide.md"}'
```

## Agent Benefits

### Context Awareness
Agents can now understand:
- File organization and hierarchy
- Related files from the same directory
- Original file locations
- Project structure

### Query Examples

**Before (without folder structure):**
```
"Find the API documentation file"
→ Agent searches all files
```

**After (with folder structure):**
```
"Find the API documentation in docs/api/"
→ Agent can filter by relative_path metadata
→ More accurate and contextual results
```

### Metadata Access

```python
# Agent can retrieve file metadata
content = agent_os.knowledge.get_content_by_id(content_id)
relative_path = content.metadata.get('relative_path')

if 'src/components/' in relative_path:
    # This is a component file
    ...
```

## Testing

### Manual Testing Steps

1. **Start the Application**
   ```bash
   docker-compose up
   ```

2. **Access the UI**
   - Navigate to http://localhost:3000
   - Open the Knowledge Upload panel

3. **Test Files Mode**
   - Click "Files" toggle
   - Upload individual files
   - Verify normal upload behavior

4. **Test Folder Mode**
   - Click "Folder" toggle
   - Click "Upload Folder"
   - Select a directory with nested files
   - Verify all files are uploaded
   - Check that folder icons appear
   - Click on items to verify metadata

5. **Test Metadata Display**
   - Click on a folder-uploaded file
   - Verify "Folder Upload" label shows
   - Check relative_path is displayed
   - Verify folder icon appears in list

### API Testing

```bash
# Test bulk upload endpoint
python tests/test_bulk_upload.py

# Or manually with curl
curl -X POST http://localhost:7777/knowledge/content/bulk \
  -F "files=@test1.txt" \
  -F "files=@test2.txt" \
  -F 'relative_paths={"0":"test/test1.txt","1":"test/test2.txt"}'
```

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Native support |
| Firefox | ✅ Full | Since v50 |
| Safari | ✅ Full | Since v11.1 |
| Edge | ✅ Full | Chromium-based |
| Opera | ✅ Full | Since v38 |

## Performance Considerations

- **Large Folders**: May take time to upload; progress shown via toast
- **File Limits**: Backend handles files sequentially to manage memory
- **Network**: Uses FormData with multipart upload for efficiency
- **Client-side**: Extracts paths synchronously (fast for most folder sizes)

## Future Enhancements

Potential improvements for future iterations:

1. **Drag & Drop Folders**
   - Add drag-and-drop support for folders
   - Visual feedback during drag operations

2. **Upload Progress**
   - Real-time progress bar for large uploads
   - Individual file upload status

3. **File Filtering**
   - Ignore patterns (e.g., .git, node_modules)
   - File type filters
   - Size limits per file

4. **Folder Tree View**
   - Visualize uploaded folder structure
   - Collapsible tree navigation
   - Search within specific folders

5. **Batch Operations**
   - Delete entire folders
   - Update metadata for all files in a folder
   - Re-upload folder with merge/replace options

6. **Advanced Metadata**
   - Git information (commit hash, branch)
   - File modification timestamps
   - Author/creator information
   - Tags and categories by folder

## Related Documentation

- [FOLDER_UPLOAD_GUIDE.md](./FOLDER_UPLOAD_GUIDE.md) - User guide and API reference
- [FRONTEND_BACKEND_INTEGRATION.md](./FRONTEND_BACKEND_INTEGRATION.md) - Integration patterns
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Overall project implementation

## Conclusion

This implementation successfully adds folder upload capability while maintaining backward compatibility with single-file uploads. The relative path metadata enables agents to have better context about file relationships, improving their ability to understand and work with project structures.

**Key Achievements:**
- ✅ Bulk folder upload with preserved structure
- ✅ Metadata enhancement for agent context
- ✅ Intuitive UI with mode toggle
- ✅ Comprehensive API support
- ✅ Detailed documentation
- ✅ Backward compatible with existing uploads
