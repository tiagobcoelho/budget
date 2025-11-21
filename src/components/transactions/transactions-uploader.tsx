'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Transaction } from '@prisma/client'

type UploadedFile = {
  id: string
  file: File
}

interface ProcessingProgress {
  currentFileIndex: number
  currentFileName: string
  currentPage: number
  totalPages: number
  extractedTransactions: number
}

interface PdfUploaderProps {
  onTransactionsExtracted: (transactions: Transaction[]) => void
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({
  onTransactionsExtracted,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)

  const handleFileAdd = useCallback(
    (file: File) => {
      const mimeType = file.type || ''
      const isPdf = mimeType === 'application/pdf'
      const isImage = mimeType.startsWith('image/')

      if (!isPdf && !isImage) {
        toast.error('Please upload a PDF or image file')
        return
      }

      // Check if file already exists
      const fileExists = uploadedFiles.some(
        (uf) => uf.file.name === file.name && uf.file.size === file.size
      )
      if (fileExists) {
        toast.warning('This file has already been added')
        return
      }

      // Add file to the list
      const newFile: UploadedFile = {
        id: `${Date.now()}-${Math.random()}`,
        file,
      }
      setUploadedFiles((prev) => [...prev, newFile])
      toast.success(`Added ${file.name}`)
    },
    [uploadedFiles]
  )

  const handleFileRemove = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const processFiles = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please add at least one file')
      return
    }

    setIsProcessing(true)
    const allTransactions: Transaction[] = []

    try {
      // Process files sequentially
      for (let fileIndex = 0; fileIndex < uploadedFiles.length; fileIndex++) {
        const uploadedFile = uploadedFiles[fileIndex]

        // Initialize progress for this file
        setProgress({
          currentFileIndex: fileIndex,
          currentFileName: uploadedFile.file.name,
          currentPage: 0,
          totalPages: 0,
          extractedTransactions: allTransactions.length,
        })

        const formData = new FormData()
        formData.append('file', uploadedFile.file)

        const response = await fetch('/api/transactions/upload-pdf', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          let errorMessage = 'Failed to process file'
          try {
            const error = await response.json()
            errorMessage = error.error || errorMessage
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
          throw new Error(
            `Failed to process ${uploadedFile.file.name}: ${errorMessage}`
          )
        }

        if (!response.body) {
          throw new Error(`No response body for ${uploadedFile.file.name}`)
        }

        // Handle streaming response
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const chunk = JSON.parse(line)

              if (chunk.type === 'progress') {
                // Update progress for current page
                setProgress((prev) => ({
                  ...prev!,
                  currentPage: chunk.data.pageNumber,
                  totalPages: chunk.data.totalPages,
                }))
              } else if (
                chunk.type === 'transaction' &&
                chunk.data?.transaction
              ) {
                allTransactions.push(chunk.data.transaction)
                // Update progress with new transaction count
                // Note: transaction chunks include pageNumber but not totalPages
                setProgress((prev) => ({
                  ...prev!,
                  extractedTransactions: allTransactions.length,
                  currentPage: chunk.data.pageNumber || prev?.currentPage || 0,
                  // Keep existing totalPages from progress updates
                  totalPages: prev?.totalPages || 0,
                }))
              } else if (chunk.type === 'complete') {
                // File processing complete
                setProgress((prev) => ({
                  ...prev!,
                  extractedTransactions: allTransactions.length,
                }))
              } else if (chunk.type === 'error') {
                throw new Error(
                  chunk.data?.error ||
                    `Error processing ${uploadedFile.file.name}`
                )
              }
            } catch (parseError) {
              // Skip invalid JSON lines, but log them
              if (parseError instanceof SyntaxError) {
                console.warn('Failed to parse chunk:', line)
              } else {
                // Re-throw non-parsing errors
                throw parseError
              }
            }
          }
        }
      }

      const fileCount = uploadedFiles.length
      if (allTransactions.length > 0) {
        setUploadedFiles([]) // Clear uploaded files after successful processing
        setProgress(null) // Clear progress state
        onTransactionsExtracted(allTransactions)
        toast.success(
          `Extracted ${allTransactions.length} transaction${allTransactions.length !== 1 ? 's' : ''} from ${fileCount} file${fileCount !== 1 ? 's' : ''}`
        )
      } else {
        setProgress(null) // Clear progress state
        toast.warning('No transactions found in the uploaded PDFs')
      }
    } catch (error) {
      setProgress(null) // Clear progress state on error
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to process files. Please ensure the uploads are valid bank statements.'
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [uploadedFiles, onTransactionsExtracted])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files) {
        Array.from(e.dataTransfer.files).forEach((file) => {
          handleFileAdd(file)
        })
      }
    },
    [handleFileAdd]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        Array.from(e.target.files).forEach((file) => {
          handleFileAdd(file)
        })
        // Reset input so same file can be selected again
        e.target.value = ''
      }
    },
    [handleFileAdd]
  )

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="size-5" />
          Upload Bank Statement PDF or Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Input Area - Hidden during processing */}
        {!isProcessing && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <FileText className="size-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drag and drop your PDF or image files here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload bank statement PDFs or screenshots (PNG, JPG, HEIC, etc.)
              to extract transactions. You can upload multiple files and process
              them all at once.
            </p>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileInput}
              className="hidden"
              id="pdf-upload"
              multiple
              disabled={isProcessing}
            />
            <Button asChild disabled={isProcessing} variant="outline">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                Select PDF Files
              </label>
            </Button>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && progress && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <h3 className="font-semibold">Processing Files...</h3>
              </div>

              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">File Progress</span>
                  <span className="font-medium">
                    Processing file {progress.currentFileIndex + 1} of{' '}
                    {uploadedFiles.length}
                  </span>
                </div>
                <Progress
                  value={
                    ((progress.currentFileIndex + 1) / uploadedFiles.length) *
                    100
                  }
                  className="h-2"
                />
              </div>

              {/* Current File Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current File</span>
                  <span className="font-medium truncate ml-2 max-w-[60%]">
                    {progress.currentFileName}
                  </span>
                </div>
              </div>

              {/* Page Progress */}
              {progress.totalPages > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Page Progress</span>
                    <span className="font-medium">
                      Page {progress.currentPage} of {progress.totalPages}
                    </span>
                  </div>
                  <Progress
                    value={(progress.currentPage / progress.totalPages) * 100}
                    className="h-2"
                  />
                </div>
              )}

              {/* Extracted Transactions Count */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">
                  Transactions Extracted
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">
                    {progress.extractedTransactions}
                  </span>
                  {progress.extractedTransactions > 0 && (
                    <CheckCircle2 className="size-5 text-green-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && !isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Uploaded Files ({uploadedFiles.length})
              </p>
            </div>
            <div className="space-y-2">
              {uploadedFiles.map((uploadedFile) => (
                <div
                  key={uploadedFile.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="size-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadedFile.file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFileRemove(uploadedFile.id)}
                    disabled={isProcessing}
                    className="shrink-0"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end">
                <Button
                  onClick={processFiles}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <Upload className="size-4" />
                  Process Files
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
