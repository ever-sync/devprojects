'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UploadDropzoneProps {
  projectId: string
  clientId: string
}

export function UploadDropzone({ projectId, clientId }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<string>('other')
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) setFile(droppedFile)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) setFile(selectedFile)
  }

  async function handleUpload() {
    if (!file) return
    setIsUploading(true)
    setError(null)
    setProgress(10)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Não autenticado')
      setIsUploading(false)
      return
    }

    const filePath = `${clientId}/${projectId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    setProgress(30)

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file, { upsert: false })

    if (uploadError) {
      setError(uploadError.message)
      setIsUploading(false)
      setProgress(0)
      return
    }

    setProgress(70)

    const { error: dbError } = await supabase.from('documents').insert({
      project_id: projectId,
      client_id: clientId,
      name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      doc_type: docType as 'contract' | 'proposal' | 'invoice' | 'boleto' | 'design' | 'report' | 'other',
      uploaded_by: user.id,
    })

    if (dbError) {
      setError(dbError.message)
      setIsUploading(false)
      setProgress(0)
      return
    }

    setProgress(100)
    setTimeout(() => {
      setFile(null)
      setProgress(0)
      setIsUploading(false)
      router.refresh()
    }, 500)
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.gif,.webp,.svg,.txt,.csv"
        />
        <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">
          {file ? file.name : 'Arraste um arquivo ou clique para selecionar'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, XLS, imagens — máx. 50MB</p>
      </div>

      {file && (
        <div className="space-y-3 bg-secondary/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Tipo de Documento</label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposal">Proposta</SelectItem>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="invoice">Nota Fiscal</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="report">Relatório</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="other">Avulso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isUploading && <Progress value={progress} className="h-1.5" />}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? `Enviando... ${progress}%` : 'Enviar Arquivo'}
          </Button>
        </div>
      )}
    </div>
  )
}
