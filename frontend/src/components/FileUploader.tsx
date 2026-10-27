import { useState } from 'react'
import axios from 'axios'
import { errorMessage, postData } from '../services/apiClient'
import { validateUpload } from '../utils/uploadRules'

type Category = 'RECEIPT' | 'DOCUMENT' | 'MEDIA' | 'FEEDBACK'

export function FileUploader({ category, value, onChange }: {
  category: Category
  value: string
  onChange: (value: string) => void
}) {
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    setError('')
    setUploading(true)
    setProgress(0)
    try {
      validateUpload(category, file.type, file.size)
      const signed = await postData<{ uploadUrl: string; fileUrl: string }>(
        '/storage/presigned-upload', {
          category, fileName: file.name, mimeType: file.type, fileSize: file.size,
        },
      )
      await axios.put(signed.uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (event) => setProgress(event.total ? Math.round(event.loaded / event.total * 100) : 0),
      })
      onChange(signed.fileUrl)
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setUploading(false) }
  }

  return <div className="space-y-2">
    <input type="file" disabled={uploading} onChange={(event) => {
      const file = event.target.files?.[0]
      if (file) void upload(file)
    }} className="block w-full text-sm" />
    {uploading && <div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-indigo-600" style={{ width: `${progress}%` }} /></div>}
    {value && <p className="break-all text-xs text-emerald-700">Đã tải lên: {value}</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>
}
