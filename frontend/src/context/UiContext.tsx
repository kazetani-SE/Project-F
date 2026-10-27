import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface UiState {
  toast: (message: string) => void
  confirm: (message: string) => Promise<boolean>
}

const UiContext = createContext<UiState | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [question, setQuestion] = useState('')
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null)

  function toast(text: string) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3000)
  }

  function confirm(text: string) {
    setQuestion(text)
    return new Promise<boolean>((done) => setResolve(() => done))
  }

  function answer(value: boolean) {
    resolve?.(value)
    setQuestion('')
    setResolve(null)
  }

  return <UiContext.Provider value={{ toast, confirm }}>
    {children}
    {message && <div role="status" className="fixed top-5 right-5 z-50 rounded-xl bg-emerald-600 px-5 py-3 text-white shadow-xl">{message}</div>}
    {question && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
        <h2 className="text-lg font-bold">Xác nhận thao tác</h2>
        <p className="mt-3 text-slate-600">{question}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => answer(false)}>Hủy</button>
          <button className="btn-primary" onClick={() => answer(true)}>Xác nhận</button>
        </div>
      </div>
    </div>}
  </UiContext.Provider>
}

export function useUi() {
  const context = useContext(UiContext)
  if (!context) throw new Error('UiProvider missing')
  return context
}
