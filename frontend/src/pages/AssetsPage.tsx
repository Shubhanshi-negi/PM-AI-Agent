import { useState, useEffect } from 'react'
import { Upload, X, File } from 'lucide-react'
import { useProject } from "../context/ProjectContext";
import { ChatWidget } from "../components/ChatWidget";
import { projectService, type ProjectAsset } from "../services/api";

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
}

export const AssetsPage = () => {
  const { currentProject, refreshProjects } = useProject();
  const projectId = currentProject?._id ?? "";
  
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (currentProject?.assets) {
      setFiles(currentProject.assets.map((asset: ProjectAsset) => ({
        id: asset._id,
        name: asset.name,
        size: asset.size,
        type: asset.type,
        uploadedAt: new Date(asset.uploadedAt)
      })));
    } else {
      setFiles([]);
    }
  }, [currentProject]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }

  const handleFiles = async (droppedFiles: File[]) => {
    if (!projectId) {
      alert("Please select a project first.");
      return;
    }

    setIsUploading(true);
    let uploaded = false;
    try {
      for (const file of droppedFiles) {
        await projectService.uploadFile(projectId, file);
        uploaded = true;
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload files.");
    } finally {
      if (uploaded) await refreshProjects();
      setIsUploading(false);
    }
  }

  const handleRemoveFile = async (id: string) => {
    if (!projectId) return;
    setIsUploading(true);
    try {
      await projectService.deleteAsset(projectId, id);
      await refreshProjects();
    } catch (error) {
      console.error("Asset removal failed", error);
      alert("Failed to remove file.");
    } finally {
      setIsUploading(false);
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left Column: Context Manager */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div>
          <h1 className="text-[26px] leading-7 font-semibold mb-2">Project Intelligence</h1>
          <p className="text-muted text-sm">Upload documents to give the AI context about your project.</p>
        </div>
        
        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed px-8 py-12 flex flex-col items-center justify-center transition-all duration-200 ease-out ${
            isDragging
              ? 'border-primary bg-primary/10 scale-105'
              : 'border-white/[0.06] bg-white/[0.03]'
          }`}
        >
          <div className="text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-200 ${
              isDragging
                ? 'bg-primary/30'
                : 'bg-white/5'
            }`}>
              <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted'}`} />
            </div>
            <div className="text-lg font-medium text-white mb-2">
              {isDragging ? 'Drop Knowledge here' : 'Feed the AI Project Knowledge'}
            </div>
            <div className="text-sm text-muted mb-4">
              Upload PRDs, Docs, or Meeting Notes (PDF, TXT, MD)
            </div>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.md,.markdown"
                onChange={handleFileInputChange}
                disabled={isUploading}
                className="hidden"
              />
              <button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement
                  input?.click()
                }}
                disabled={isUploading}
                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-sm font-medium text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Select Files'}
              </button>
            </label>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 ? (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4">
            <div className="text-sm font-semibold text-white mb-4">
              Uploaded Files ({files.length})
            </div>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <File className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-muted">
                        {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    disabled={isUploading}
                    className="flex-shrink-0 ml-2 p-2 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : !isUploading && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-8 py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <File className="w-8 h-8 text-muted" />
            </div>
            <div className="text-lg font-medium text-white mb-2">No assets yet</div>
            <div className="text-sm text-muted">Files you upload will appear here.</div>
          </div>
        )}
      </div>

      {/* Right Column: AI Chat Assistant */}
      <div className="w-[400px] flex flex-col">
         {/* Reusing ChatWidget in inline mode */}
         <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.06]">
            <ChatWidget projectId={projectId} inline={true} />
         </div>
      </div>
    </div>
  )
}
