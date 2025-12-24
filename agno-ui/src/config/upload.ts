// Upload configuration and validation

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024 // 50 MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024 // 50 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100 MB
export const MAX_CODE_SIZE = 5 * 1024 * 1024 // 5 MB
export const MAX_BATCH_SIZE = 500 * 1024 * 1024 // 500 MB total

// Allowed file extensions by category
export const ALLOWED_EXTENSIONS = {
    documents: [
        '.pdf', '.txt', '.md', '.markdown',
        '.doc', '.docx', '.rtf',
        '.csv', '.xls', '.xlsx',
        '.ppt', '.pptx',
        '.json', '.yaml', '.yml', '.xml'
    ],
    images: [
        '.jpg', '.jpeg', '.png', '.gif',
        '.webp', '.svg', '.bmp'
    ],
    audio: [
        '.mp3', '.wav', '.ogg', '.m4a', '.flac'
    ],
    video: [
        '.mp4', '.webm', '.avi', '.mov'
    ],
    code: [
        '.py', '.js', '.jsx', '.ts', '.tsx',
        '.html', '.htm', '.css', '.scss', '.sass', '.less',
        '.java', '.c', '.cpp', '.h', '.hpp',
        '.go', '.rs', '.rb', '.php',
        '.sh', '.bash', '.sql'
    ]
}

// All allowed extensions (flattened)
export const ALL_ALLOWED_EXTENSIONS = Object.values(ALLOWED_EXTENSIONS).flat()

// Blocked file extensions
export const BLOCKED_EXTENSIONS = [
    // Executables
    '.exe', '.dll', '.so', '.dylib', '.app',
    '.deb', '.rpm', '.msi', '.apk', '.ipa',
    '.bat', '.cmd', '.ps1', '.com', '.scr',
    
    // Archives
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
    '.tgz', '.tbz', '.xz',
    
    // Databases
    '.db', '.sqlite', '.sqlite3', '.mdb',
    
    // System files
    '.sys', '.dmg', '.iso', '.img',
    
    // Binary/Compiled
    '.bin', '.dat', '.class', '.pyc', '.o', '.obj'
]

export type FileCategory = 'documents' | 'images' | 'audio' | 'video' | 'code' | 'unknown'

export interface FileValidationResult {
    valid: boolean
    error?: string
    category?: FileCategory
    maxSize?: number
}

/**
 * Get the category of a file based on its extension
 */
export function getFileCategory(filename: string): FileCategory {
    const ext = getFileExtension(filename)
    
    for (const [category, extensions] of Object.entries(ALLOWED_EXTENSIONS)) {
        if (extensions.includes(ext)) {
            return category as FileCategory
        }
    }
    
    return 'unknown'
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    const ext = filename.toLowerCase().match(/\.[^.]*$/)
    return ext ? ext[0] : ''
}

/**
 * Get maximum allowed size for a file based on its extension
 */
export function getMaxSizeForFile(filename: string): number {
    const category = getFileCategory(filename)
    
    const sizeLimits: Record<FileCategory, number> = {
        documents: MAX_DOCUMENT_SIZE,
        images: MAX_IMAGE_SIZE,
        audio: MAX_AUDIO_SIZE,
        video: MAX_VIDEO_SIZE,
        code: MAX_CODE_SIZE,
        unknown: MAX_FILE_SIZE
    }
    
    return sizeLimits[category]
}

/**
 * Check if a file extension is allowed
 */
export function isExtensionAllowed(filename: string): boolean {
    const ext = getFileExtension(filename)
    return ALL_ALLOWED_EXTENSIONS.includes(ext)
}

/**
 * Check if a file extension is blocked
 */
export function isExtensionBlocked(filename: string): boolean {
    const ext = getFileExtension(filename)
    return BLOCKED_EXTENSIONS.includes(ext)
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Validate a file for upload
 */
export function validateFile(file: File): FileValidationResult {
    const filename = file.name
    const ext = getFileExtension(filename)
    const category = getFileCategory(filename)
    const maxSize = getMaxSizeForFile(filename)
    
    // Check if extension is blocked
    if (isExtensionBlocked(filename)) {
        return {
            valid: false,
            error: `File type not allowed: ${ext}. Executable and archive files are blocked for security.`,
            category
        }
    }
    
    // Check if extension is allowed
    if (!isExtensionAllowed(filename)) {
        return {
            valid: false,
            error: `File type not supported: ${ext}. Only documents, images, audio, videos, and code files are allowed.`,
            category
        }
    }
    
    // Check file size
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File too large: ${formatFileSize(file.size)}. Maximum for ${category}: ${formatFileSize(maxSize)}`,
            category,
            maxSize
        }
    }
    
    // Check absolute maximum
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File exceeds maximum size: ${formatFileSize(file.size)}. Maximum: ${formatFileSize(MAX_FILE_SIZE)}`,
            category,
            maxSize
        }
    }
    
    return {
        valid: true,
        category,
        maxSize
    }
}

/**
 * Validate multiple files for batch upload
 */
export function validateFiles(files: File[]): FileValidationResult[] {
    const results: FileValidationResult[] = []
    let totalSize = 0
    
    for (const file of files) {
        const result = validateFile(file)
        results.push(result)
        
        if (result.valid) {
            totalSize += file.size
        }
    }
    
    // Check total batch size
    if (totalSize > MAX_BATCH_SIZE) {
        return results.map(result => ({
            ...result,
            valid: false,
            error: result.error || `Total upload size ${formatFileSize(totalSize)} exceeds maximum ${formatFileSize(MAX_BATCH_SIZE)}`
        }))
    }
    
    return results
}

/**
 * Get accept attribute value for file input
 */
export function getAcceptAttribute(): string {
    return ALL_ALLOWED_EXTENSIONS.join(',')
}
