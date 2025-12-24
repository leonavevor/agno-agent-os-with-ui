'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import { toast } from 'sonner'
import { useStore } from '@/store'
import {
    uploadKnowledge,
    bulkUploadKnowledge,
    listKnowledge,
    deleteKnowledge,
    deleteAllKnowledge,
    getKnowledgeStatus,
    type KnowledgeContent
} from '@/api/advanced'
import {
    validateFile,
    validateFiles,
    getAcceptAttribute,
    formatFileSize,
} from '@/config/upload'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

export default function KnowledgeUpload() {
    const [knowledgeList, setKnowledgeList] = useState<KnowledgeContent[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [deleteContentId, setDeleteContentId] = useState<string | null>(null)
    const [showClearAllDialog, setShowClearAllDialog] = useState(false)
    const [selectedItem, setSelectedItem] = useState<KnowledgeContent | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | KnowledgeContent['status']>('all')
    const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const folderInputRef = useRef<HTMLInputElement>(null)
    const { selectedEndpoint, authToken } = useStore()

    const loadKnowledge = async () => {
        if (!selectedEndpoint) return

        setIsLoading(true)
        try {
            const response = await listKnowledge(selectedEndpoint, 1, 100, authToken)
            setKnowledgeList(response.data)
        } catch (error) {
            console.error('Failed to load knowledge:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadKnowledge()
        // Poll for status updates every 5 seconds
        const interval = setInterval(() => {
            const processingItems = knowledgeList.filter(
                k => k.status === 'pending' || k.status === 'processing'
            )
            if (processingItems.length > 0) {
                loadKnowledge()
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [selectedEndpoint])

    const filteredKnowledge = useMemo(() => {
        return knowledgeList.filter(item => {
            const matchesSearch = searchQuery === '' ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())

            const matchesStatus = statusFilter === 'all' || item.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [knowledgeList, searchQuery, statusFilter])

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files || files.length === 0 || !selectedEndpoint) return

        // Validate all files before upload
        const filesArray = Array.from(files)
        const validationResults = validateFiles(filesArray)
        
        // Check for validation errors
        const invalidFiles = validationResults.filter(r => !r.valid)
        if (invalidFiles.length > 0) {
            // Show first error
            toast.error(invalidFiles[0].error || 'File validation failed')
            
            // Show summary if multiple files failed
            if (invalidFiles.length > 1) {
                toast.error(`${invalidFiles.length} files failed validation`)
            }
            
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
            return
        }

        setIsUploading(true)
        try {
            for (let i = 0; i < filesArray.length; i++) {
                const file = filesArray[i]
                await uploadKnowledge(selectedEndpoint, file, undefined, undefined, authToken)
            }
            await loadKnowledge()
            toast.success(`Successfully uploaded ${filesArray.length} file(s)`)
        } catch (error) {
            console.error('Upload failed:', error)
            toast.error('Some files failed to upload')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files || files.length === 0 || !selectedEndpoint) return

        // Extract relative paths and validate files
        const filesArray = Array.from(files)
        
        // Validate all files before upload
        const validationResults = validateFiles(filesArray)
        
        // Filter out invalid files and show errors
        const validFiles: File[] = []
        const relativePaths: Record<string, string> = {}
        let validIndex = 0
        
        filesArray.forEach((file, index) => {
            const result = validationResults[index]
            
            if (result.valid) {
                validFiles.push(file)
                const relativePath = (file as any).webkitRelativePath || file.name
                relativePaths[validIndex.toString()] = relativePath
                validIndex++
            } else {
                toast.error(`${file.name}: ${result.error}`)
            }
        })
        
        if (validFiles.length === 0) {
            toast.error('No valid files to upload')
            if (folderInputRef.current) {
                folderInputRef.current.value = ''
            }
            return
        }
        
        // Show warning if some files were filtered
        const filteredCount = filesArray.length - validFiles.length
        if (filteredCount > 0) {
            toast.warning(`${filteredCount} file(s) skipped due to validation errors`)
        }

        setIsUploading(true)
        try {
            // Bulk upload with relative paths preserved
            await bulkUploadKnowledge(
                selectedEndpoint,
                validFiles,
                relativePaths,
                undefined,
                authToken
            )
            
            await loadKnowledge()
        } catch (error) {
            console.error('Folder upload failed:', error)
            toast.error('Folder upload failed')
        } finally {
            setIsUploading(false)
            if (folderInputRef.current) {
                folderInputRef.current.value = ''
            }
        }
    }

    const handleDelete = async (contentId: string) => {
        if (!selectedEndpoint) return

        try {
            await deleteKnowledge(selectedEndpoint, contentId, authToken)
            await loadKnowledge()
        } catch (error) {
            console.error('Delete failed:', error)
        } finally {
            setDeleteContentId(null)
        }
    }

    const handleClearAll = async () => {
        if (!selectedEndpoint) return

        try {
            await deleteAllKnowledge(selectedEndpoint, authToken)
            setKnowledgeList([])
        } catch (error) {
            console.error('Clear all failed:', error)
        } finally {
            setShowClearAllDialog(false)
        }
    }

    const getStatusBadge = (status: KnowledgeContent['status']) => {
        const variants = {
            completed: 'default',
            processing: 'secondary',
            pending: 'secondary',
            failed: 'destructive'
        } as const

        return (
            <Badge variant={variants[status]} className="text-[10px]">
                {status}
            </Badge>
        )
    }

    const getStatusCount = (status: KnowledgeContent['status']) => {
        return knowledgeList.filter(item => item.status === status).length
    }

    const formatFileSize = (size?: string) => {
        if (!size) return 'Unknown size'
        const bytes = parseInt(size)
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            const now = new Date()
            const diffMs = now.getTime() - date.getTime()
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            const diffDays = Math.floor(diffMs / 86400000)

            if (diffMins < 1) return 'Just now'
            if (diffMins < 60) return `${diffMins}m ago`
            if (diffHours < 24) return `${diffHours}h ago`
            if (diffDays < 7) return `${diffDays}d ago`
            return date.toLocaleDateString()
        } catch {
            return dateString
        }
    }

    return (
        <div className="flex w-full flex-col gap-2">
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={loadKnowledge}
                    disabled={isLoading}
                    className="text-[10px] font-medium uppercase text-primary hover:text-primary/80 disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Refresh'}
                </button>
                {knowledgeList.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowClearAllDialog(true)}
                        className="text-[10px] font-medium uppercase text-rose-400/90 hover:text-rose-400/70"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Stats Dashboard */}
            {knowledgeList.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-primary/10 bg-accent/30 p-2">
                        <div className="text-[10px] text-muted/70 uppercase">Total</div>
                        <div className="text-lg font-bold text-primary">{knowledgeList.length}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-2">
                        <div className="text-[10px] text-muted/70 uppercase">Completed</div>
                        <div className="text-lg font-bold text-emerald-400/80">{getStatusCount('completed')}</div>
                    </div>
                </div>
            )}

            {/* Search and Filter */}
            {knowledgeList.length > 0 && (
                <div className="flex flex-col gap-2">
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search knowledge..."
                        className="h-8 w-full rounded-lg border border-primary/15 bg-accent px-2 text-[11px] text-muted placeholder:text-muted/60 focus:border-primary focus:outline-none"
                    />
                    <div className="flex gap-1">
                        {(['all', 'completed', 'processing', 'pending', 'failed'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`rounded px-2 py-1 text-[9px] font-medium uppercase transition-colors ${statusFilter === status
                                    ? 'bg-primary text-background'
                                    : 'bg-accent/50 text-muted/70 hover:bg-accent'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={getAcceptAttribute()}
                onChange={handleFileSelect}
                className="hidden"
                id="knowledge-upload"
            />

            <input
                ref={folderInputRef}
                type="file"
                accept={getAcceptAttribute()}
                // @ts-ignore - webkitdirectory is not in the TypeScript types
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFolderSelect}
                className="hidden"
                id="folder-upload"
            />

            {/* Upload Mode Toggle */}
            <div className="flex gap-1 mb-2">
                <button
                    onClick={() => setUploadMode('files')}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-[10px] font-medium uppercase transition-colors ${
                        uploadMode === 'files'
                            ? 'bg-primary text-background'
                            : 'bg-accent/50 text-muted/70 hover:bg-accent'
                    }`}
                >
                    <Icon type="database" size="xs" className={uploadMode === 'files' ? 'text-background' : 'text-muted/70'} />
                    Files
                </button>
                <button
                    onClick={() => setUploadMode('folder')}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-[10px] font-medium uppercase transition-colors ${
                        uploadMode === 'folder'
                            ? 'bg-primary text-background'
                            : 'bg-accent/50 text-muted/70 hover:bg-accent'
                    }`}
                >
                    <Icon type="folder" size="xs" className={uploadMode === 'folder' ? 'text-background' : 'text-muted/70'} />
                    Folder
                </button>
            </div>

            {/* File Type Info */}
            <div className="mb-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2 text-[9px] text-blue-400/80">
                <div className="font-medium mb-1">📎 Allowed: Docs, Images, Audio, Video (100MB max)</div>
                <div className="text-blue-400/60">🚫 Blocked: Executables, Archives, Large Files</div>
            </div>

            <Button
                onClick={() => uploadMode === 'files' ? fileInputRef.current?.click() : folderInputRef.current?.click()}
                disabled={isUploading || !selectedEndpoint}
                size="lg"
                className="h-9 w-full rounded-xl bg-primary text-xs font-medium text-background hover:bg-primary/80"
            >
                {isUploading ? (
                    <>
                        <Icon type="loader" size="xs" className="animate-spin text-background" />
                        <span className="uppercase">Uploading...</span>
                    </>
                ) : (
                    <>
                        <Icon type="upload" size="xs" className="text-background" />
                        <span className="uppercase">
                            {uploadMode === 'folder' ? 'Upload Folder' : 'Upload Files'}
                        </span>
                    </>
                )}
            </Button>

            <ScrollArea className="max-h-60 w-full">
                {isLoading && knowledgeList.length === 0 ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-16 animate-pulse rounded-lg border border-primary/10 bg-accent/30"
                            />
                        ))}
                    </div>
                ) : filteredKnowledge.length === 0 ? (
                    <div className="py-8 text-center">
                        <Icon type="database" size="sm" className="mx-auto mb-2 text-muted/50" />
                        <p className="text-[11px] text-muted/70">
                            {knowledgeList.length === 0 ? 'No knowledge uploaded yet' : 'No matches found'}
                        </p>
                        <p className="mt-1 text-[10px] text-muted/50">
                            {knowledgeList.length === 0 ? 'Upload documents to enhance your agent' : 'Try adjusting your filters'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 pr-2">
                        {filteredKnowledge.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-lg border border-primary/10 bg-accent/30 p-2 hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={() => setSelectedItem(item)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            {item.metadata?.upload_type === 'bulk_folder' && (
                                                <Icon type="folder" size="xs" className="text-emerald-400/70 flex-shrink-0" />
                                            )}
                                            <span className="truncate text-[11px] font-semibold text-primary">
                                                {item.name}
                                            </span>
                                            {getStatusBadge(item.status)}
                                        </div>
                                        {item.metadata?.relative_path && (
                                            <div className="mt-0.5 text-[9px] text-muted/60 truncate">
                                                {item.metadata.relative_path}
                                            </div>
                                        )}
                                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted/70">
                                            <span>{formatFileSize(item.size)}</span>
                                            <span>•</span>
                                            <span>{formatDate(item.created_at)}</span>
                                        </div>
                                        {item.description && (
                                            <p className="mt-1 text-[10px] text-muted/70 line-clamp-1">
                                                {item.description}
                                            </p>
                                        )}
                                        {item.status === 'failed' && item.status_message && (
                                            <p className="mt-1 text-[10px] text-rose-400/80 line-clamp-1">
                                                {item.status_message}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setDeleteContentId(item.id)
                                        }}
                                        className="shrink-0 p-1 hover:bg-destructive/10 rounded"
                                        title="Delete"
                                    >
                                        <Icon type="trash" size="xs" className="text-rose-400/80" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={deleteContentId !== null}
                onOpenChange={(open) => !open && setDeleteContentId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Knowledge</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this knowledge item? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteContentId && handleDelete(deleteContentId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Clear All Confirmation Dialog */}
            <AlertDialog
                open={showClearAllDialog}
                onOpenChange={setShowClearAllDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Knowledge</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete ALL knowledge items? This action cannot be undone and will permanently remove all uploaded documents.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleClearAll}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Clear All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Knowledge Details Dialog */}
            <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Icon type="database" size="sm" />
                            Knowledge Details
                        </DialogTitle>
                        <DialogDescription>
                            View and manage knowledge item information
                        </DialogDescription>
                    </DialogHeader>
                    {selectedItem && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-sm font-semibold break-all">
                                            {selectedItem.name}
                                        </CardTitle>
                                        {getStatusBadge(selectedItem.status)}
                                    </div>
                                    {selectedItem.description && (
                                        <CardDescription className="text-xs">
                                            {selectedItem.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <div className="text-muted/70 uppercase text-[10px]">File Size</div>
                                            <div className="font-medium">{formatFileSize(selectedItem.size)}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted/70 uppercase text-[10px]">Type</div>
                                            <div className="font-medium truncate">{selectedItem.type || 'Unknown'}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted/70 uppercase text-[10px]">Uploaded</div>
                                            <div className="font-medium">{formatDate(selectedItem.created_at)}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted/70 uppercase text-[10px]">Updated</div>
                                            <div className="font-medium">{formatDate(selectedItem.updated_at)}</div>
                                        </div>
                                        {selectedItem.access_count !== null && (
                                            <div className="col-span-2">
                                                <div className="text-muted/70 uppercase text-[10px]">Access Count</div>
                                                <div className="font-medium">{selectedItem.access_count}</div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedItem.status === 'failed' && selectedItem.status_message && (
                                        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                                            <div className="text-[10px] text-rose-400/70 uppercase font-medium mb-1">Error Message</div>
                                            <div className="text-xs text-rose-400/90">{selectedItem.status_message}</div>
                                        </div>
                                    )}

                                    {selectedItem.metadata && Object.keys(selectedItem.metadata).length > 0 && (
                                        <div className="rounded-lg border border-primary/10 bg-accent/30 p-3">
                                            <div className="text-[10px] text-muted/70 uppercase font-medium mb-2">
                                                Metadata
                                                {selectedItem.metadata.upload_type === 'bulk_folder' && (
                                                    <span className="ml-2 text-emerald-400/70">(Folder Upload)</span>
                                                )}
                                            </div>
                                            <div className="space-y-1 text-xs">
                                                {Object.entries(selectedItem.metadata).map(([key, value]) => (
                                                    <div key={key} className="flex justify-between gap-2">
                                                        <span className={`text-muted/70 ${key === 'relative_path' ? 'font-semibold text-primary/70' : ''}`}>
                                                            {key === 'relative_path' ? '📁 ' : ''}{key}:
                                                        </span>
                                                        <span className={`font-medium text-right break-all ${key === 'relative_path' ? 'text-primary' : ''}`}>
                                                            {String(value)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            onClick={() => {
                                                setDeleteContentId(selectedItem.id)
                                                setSelectedItem(null)
                                            }}
                                            variant="destructive"
                                            size="sm"
                                            className="flex-1"
                                        >
                                            <Icon type="trash" size="xs" />
                                            Delete
                                        </Button>
                                        <Button
                                            onClick={() => setSelectedItem(null)}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
