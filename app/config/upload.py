"""
Upload configuration and validation utilities
"""

from typing import Set, Dict

# Maximum file sizes (in bytes)
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100 MB
MAX_CODE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_BATCH_SIZE = 500 * 1024 * 1024  # 500 MB total

# Allowed file extensions by category
ALLOWED_EXTENSIONS: Dict[str, Set[str]] = {
    "documents": {
        ".pdf", ".txt", ".md", ".markdown",
        ".doc", ".docx", ".rtf",
        ".csv", ".xls", ".xlsx",
        ".ppt", ".pptx",
        ".json", ".yaml", ".yml", ".xml"
    },
    "images": {
        ".jpg", ".jpeg", ".png", ".gif",
        ".webp", ".svg", ".bmp"
    },
    "audio": {
        ".mp3", ".wav", ".ogg", ".m4a", ".flac"
    },
    "video": {
        ".mp4", ".webm", ".avi", ".mov"
    },
    "code": {
        ".py", ".js", ".jsx", ".ts", ".tsx",
        ".html", ".htm", ".css", ".scss", ".sass", ".less",
        ".java", ".c", ".cpp", ".h", ".hpp",
        ".go", ".rs", ".rb", ".php",
        ".sh", ".bash", ".sql"
    }
}

# All allowed extensions (flattened)
ALL_ALLOWED_EXTENSIONS = set().union(*ALLOWED_EXTENSIONS.values())

# Blocked file extensions (executables, archives, etc.)
BLOCKED_EXTENSIONS = {
    # Executables
    ".exe", ".dll", ".so", ".dylib", ".app",
    ".deb", ".rpm", ".msi", ".apk", ".ipa",
    ".bat", ".cmd", ".ps1", ".com", ".scr",
    
    # Archives (should be extracted first)
    ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2",
    ".tgz", ".tbz", ".xz",
    
    # Databases
    ".db", ".sqlite", ".sqlite3", ".mdb",
    
    # System files
    ".sys", ".dmg", ".iso", ".img",
    
    # Binary/Compiled
    ".bin", ".dat", ".class", ".pyc", ".o", ".obj"
}

# MIME type mappings for additional validation
ALLOWED_MIME_TYPES = {
    # Documents
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/rtf",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/json",
    "application/x-yaml",
    "text/yaml",
    "application/xml",
    "text/xml",
    
    # Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    
    # Audio
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/mp4",
    "audio/flac",
    
    # Video
    "video/mp4",
    "video/webm",
    "video/x-msvideo",
    "video/quicktime",
    
    # Code (text-based)
    "text/html",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/x-python",
    "text/x-python",
    "application/x-sh",
    "text/x-sh",
}

# Executable file signatures (magic numbers)
EXECUTABLE_SIGNATURES = [
    b"MZ",  # DOS/Windows executable
    b"\x7fELF",  # Linux/Unix executable
    b"\xca\xfe\xba\xbe",  # macOS Mach-O (32-bit)
    b"\xcf\xfa\xed\xfe",  # macOS Mach-O (64-bit)
    b"PK\x03\x04",  # ZIP archive (potential executable)
]


def get_file_category(extension: str) -> str:
    """Get the category of a file based on its extension."""
    extension = extension.lower()
    for category, extensions in ALLOWED_EXTENSIONS.items():
        if extension in extensions:
            return category
    return "unknown"


def get_max_size_for_extension(extension: str) -> int:
    """Get the maximum allowed size for a file based on its extension."""
    category = get_file_category(extension)
    
    size_limits = {
        "documents": MAX_DOCUMENT_SIZE,
        "images": MAX_IMAGE_SIZE,
        "audio": MAX_AUDIO_SIZE,
        "video": MAX_VIDEO_SIZE,
        "code": MAX_CODE_SIZE,
    }
    
    return size_limits.get(category, MAX_FILE_SIZE)


def is_extension_allowed(extension: str) -> bool:
    """Check if a file extension is allowed."""
    return extension.lower() in ALL_ALLOWED_EXTENSIONS


def is_extension_blocked(extension: str) -> bool:
    """Check if a file extension is explicitly blocked."""
    return extension.lower() in BLOCKED_EXTENSIONS


def is_mime_type_allowed(mime_type: str) -> bool:
    """Check if a MIME type is allowed."""
    if not mime_type:
        return False
    
    # Direct match
    if mime_type.lower() in ALLOWED_MIME_TYPES:
        return True
    
    # Allow text/* MIME types for code files
    if mime_type.lower().startswith("text/"):
        return True
    
    return False


def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def is_executable_content(content: bytes) -> bool:
    """Check if file content contains executable signatures."""
    if len(content) < 4:
        return False
    
    # Check first few bytes for known executable signatures
    for signature in EXECUTABLE_SIGNATURES:
        if content[:len(signature)] == signature:
            return True
    
    return False
