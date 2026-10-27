import { describe, expect, it } from 'vitest'
import { validateUpload } from './uploadRules'

describe('validateUpload', () => {
  it('limits receipt uploads to 15 MB and safe MIME types', () => {
    expect(() => validateUpload('RECEIPT', 'image/png', 15 * 1024 * 1024)).not.toThrow()
    expect(() => validateUpload('RECEIPT', 'image/png', 15 * 1024 * 1024 + 1)).toThrow()
    expect(() => validateUpload('RECEIPT', 'application/zip', 1024)).toThrow()
  })

  it('allows documents up to 50 MB', () => {
    expect(() => validateUpload('DOCUMENT', 'application/pdf', 50 * 1024 * 1024)).not.toThrow()
    expect(() => validateUpload('DOCUMENT', 'application/pdf', 50 * 1024 * 1024 + 1)).toThrow()
  })
})
