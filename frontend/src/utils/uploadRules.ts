export type UploadCategory = 'RECEIPT' | 'DOCUMENT' | 'MEDIA' | 'FEEDBACK'

const receiptTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export function validateUpload(category: UploadCategory, mimeType: string, size: number): void {
  const max = category === 'RECEIPT' ? 15 : 50
  if (!Number.isFinite(size) || size <= 0 || size > max * 1024 * 1024) {
    throw new Error(`Tệp phải nhỏ hơn ${max} MB.`)
  }
  if (category === 'RECEIPT' && !receiptTypes.has(mimeType)) {
    throw new Error('Hóa đơn chỉ hỗ trợ JPG, PNG, WEBP hoặc PDF.')
  }
}
