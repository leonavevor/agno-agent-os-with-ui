# File Upload Configuration

## Allowed File Types

### Documents
- PDF: `.pdf`
- Text: `.txt`, `.md`, `.markdown`
- Word: `.doc`, `.docx`
- Spreadsheets: `.csv`, `.xls`, `.xlsx`
- Presentations: `.ppt`, `.pptx`
- Rich Text: `.rtf`
- JSON: `.json`
- YAML: `.yaml`, `.yml`
- XML: `.xml`

### Images
- JPEG: `.jpg`, `.jpeg`
- PNG: `.png`
- GIF: `.gif`
- WebP: `.webp`
- SVG: `.svg`
- BMP: `.bmp`

### Audio
- MP3: `.mp3`
- WAV: `.wav`
- OGG: `.ogg`
- M4A: `.m4a`
- FLAC: `.flac`

### Video (Short clips only)
- MP4: `.mp4`
- WebM: `.webm`
- AVI: `.avi`
- MOV: `.mov`

### Code/Development
- Python: `.py`
- JavaScript: `.js`, `.jsx`
- TypeScript: `.ts`, `.tsx`
- HTML: `.html`, `.htm`
- CSS: `.css`, `.scss`, `.sass`, `.less`
- Java: `.java`
- C/C++: `.c`, `.cpp`, `.h`, `.hpp`
- Go: `.go`
- Rust: `.rs`
- Ruby: `.rb`
- PHP: `.php`
- Shell: `.sh`, `.bash`
- SQL: `.sql`

## File Size Limits

- **Documents**: 50 MB max
- **Images**: 10 MB max
- **Audio**: 50 MB max (approx. 50 minutes at 128kbps)
- **Video**: 100 MB max (approx. 5-10 minutes)
- **Code**: 5 MB max

### Overall Limits
- Single file: 100 MB max
- Total upload batch: 500 MB max

## Blocked File Types

### Executables
- `.exe`, `.dll`, `.so`, `.dylib`
- `.app`, `.deb`, `.rpm`
- `.msi`, `.apk`, `.ipa`
- `.bat`, `.cmd`, `.ps1`
- `.com`, `.scr`

### Archives (Large)
- `.zip`, `.rar`, `.7z`, `.tar`, `.gz`
- Large archives can be extracted and uploaded as folders

### Databases
- `.db`, `.sqlite`, `.mdb`
- `.dump`, `.sql` (large dumps)

### System Files
- `.sys`, `.ini`, `.cfg` (system)
- `.dmg`, `.iso`, `.img`

### Binary/Compiled
- `.bin`, `.dat` (binary)
- `.class`, `.pyc`, `.o`

## Validation Rules

### Frontend (Client-side)
1. Check file extension against allowed list
2. Check file size before upload
3. Display clear error messages
4. Prevent upload of blocked types

### Backend (Server-side)
1. Validate MIME type
2. Check file extension
3. Verify file size
4. Scan for executable headers
5. Reject blocked types with detailed errors

## Security Considerations

- All files are scanned for executable signatures
- MIME type validation prevents header manipulation
- File size limits prevent DoS attacks
- Extension validation prevents disguised executables
- Path traversal protection on all uploads

## Examples

### ✅ Allowed Uploads
```
✓ documentation.pdf (5 MB)
✓ presentation.pptx (12 MB)
✓ data.csv (2 MB)
✓ screenshot.png (800 KB)
✓ tutorial.mp4 (85 MB)
✓ podcast.mp3 (45 MB)
✓ source_code.py (150 KB)
```

### ❌ Blocked Uploads
```
✗ installer.exe - Executable file
✗ malware.dll - Dynamic library
✗ archive.zip - Compressed archive (extract first)
✗ database.db - Database file
✗ huge_video.mp4 (500 MB) - Exceeds size limit
✗ application.app - Application bundle
```

## Configuration

File type and size restrictions can be adjusted in:

### Frontend
- File: `agno-ui/src/config/upload.ts`
- Modify allowed extensions and size limits

### Backend
- File: `app/config/upload.py`
- Update ALLOWED_EXTENSIONS and MAX_FILE_SIZE

## Error Messages

### File Type Errors
- "File type not allowed: {extension}"
- "Only documents, images, audio, and videos are supported"
- "Executable files are not permitted"

### Size Errors
- "File too large: {size}. Maximum: {max_size}"
- "Video must be under 100 MB"
- "Total upload size exceeds limit"

## Best Practices

1. **Compress large files** before upload when possible
2. **Split large videos** into smaller clips
3. **Extract archives** and upload individual files
4. **Convert executables** to text/documentation
5. **Use appropriate formats** (e.g., PDF for documents)
