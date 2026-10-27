import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileUploader } from '../components/FileUploader'
import { useActiveEvent } from '../context/ActiveEventContext'
import { useUi } from '../context/UiContext'
import { api, errorMessage, getData, patchData, postData, putData } from '../services/apiClient'
import type { PageResponse, Row } from '../types/api'
import { resources } from './resources'
import type { Action, Field } from './resources'

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value === 'number') return new Intl.NumberFormat('vi-VN').format(value)
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function FieldInput({ field, value, onChange, options }: {
  field: Field
  value: string
  onChange: (value: string) => void
  options: Row[]
}) {
  if (field.type === 'file' && field.category) return <FileUploader category={field.category} value={value} onChange={onChange} />
  const shared = { id: field.key, value, required: field.required, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value) }
  if (field.type === 'textarea') return <textarea {...shared} rows={3} className="input" />
  if (field.type === 'select') return <select {...shared} className="input">
    <option value="">Chọn...</option>
    {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
    {options.map((option) => <option key={option.id} value={option.id}>{display(option[field.optionLabel || 'name'])}</option>)}
  </select>
  return <input {...shared} type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} className="input" />
}

export default function ResourcePage() {
  const { resourceKey = '', eventId: routeEventId } = useParams()
  const def = resources[resourceKey]
  const navigate = useNavigate()
  const { currentEvent, events, reload: reloadEvents } = useActiveEvent()
  const { toast, confirm } = useUi()
  const eventId = routeEventId || currentEvent?.id || ''
  const seriesId = events.find((event) => event.id === eventId)?.seriesId || currentEvent?.seriesId || ''
  const [items, setItems] = useState<Row[]>([])
  const [options, setOptions] = useState<Record<string, Row[]>>({})
  const [values, setValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState('')
  const [feedbackSummary, setFeedbackSummary] = useState<{ responseCount: number; averageRating: number | null } | null>(null)
  const [receiptExpenseId, setReceiptExpenseId] = useState<string | null>(null)
  const [receiptUrl, setReceiptUrl] = useState('')

  const path = def?.path(eventId, seriesId) || ''
  const requiresEvent = !['members', 'series', 'events', 'categories', 'benchmarks'].includes(resourceKey)
  const missingScope = requiresEvent && (!eventId || (resourceKey === 'faqs' && !seriesId))

  async function load() {
    if (!def || missingScope) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({ page: String(page), size: '20' })
      if (keyword) query.set('keyword', keyword)
      if (filter && resourceKey === 'members') query.set('department', filter)
      if (filter && resourceKey === 'events') query.set('status', filter)
      const data = await getData<PageResponse<Row> | Row[]>(`${path}?${query}`)
      if (Array.isArray(data)) { setItems(data); setTotalPages(1) }
      else { setItems(data.items); setTotalPages(data.totalPages) }
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [path, page, keyword, filter])

  useEffect(() => {
    if (resourceKey === 'feedbacks' && eventId) {
      void getData<{ responseCount: number; averageRating: number | null }>(`/events/${eventId}/feedback-summary`)
        .then(setFeedbackSummary).catch(() => setFeedbackSummary(null))
    }
  }, [resourceKey, eventId, items.length])

  useEffect(() => {
    if (!def || missingScope) return
    for (const field of def.fields) {
      if (!field.optionsUrl) continue
      const url = field.optionsUrl(eventId, seriesId)
      void getData<PageResponse<Row> | Row[]>(url).then((result) => {
        setOptions((before) => ({ ...before, [field.key]: Array.isArray(result) ? result : result.items }))
      }).catch(() => {})
    }
  }, [resourceKey, eventId, seriesId])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!def) return
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {}
      for (const field of def.fields) {
        const value = values[field.key]
        if (value === undefined || value === '') continue
        body[field.key] = field.type === 'number' ? Number(value) : value
      }
      if (editing) {
        const editPath = resourceKey === 'benchmarks' ? `/finance/benchmarks/${editing}` : `/${resourceKey}/${editing}`
        await putData<Row>(editPath, body)
      } else {
        await postData<Row>(path, def.prepare ? def.prepare(body) : body)
      }
      toast('Đã lưu thành công')
      setValues({})
      setOpen(false)
      setEditing(null)
      await load()
      if (def.afterCreate === 'events') await reloadEvents()
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setSaving(false) }
  }

  async function act(action: Action, row: Row) {
    const reason = action.reason ? window.prompt('Lý do từ chối:') : undefined
    if (action.reason && !reason?.trim()) return
    if (!await confirm(`${action.label} mục này?`)) return
    try {
      const body = typeof action.body === 'function' ? action.body(row) : action.body
      if (action.method === 'DELETE') await api.delete(action.path(eventId, seriesId, row))
      else await patchData(action.path(eventId, seriesId, row), {
        ...body, ...(reason ? { rejectionReason: reason } : {}),
      })
      toast('Đã cập nhật')
      await load()
    } catch (cause) { setError(errorMessage(cause)) }
  }

  function beginEdit(row: Row) {
    setEditing(row.id)
    setValues(Object.fromEntries(def.fields.map((field) => [field.key, String(row[field.key] ?? '')])))
    setOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function openFile(row: Row) {
    const receipt = Array.isArray(row.receipts) ? row.receipts[0] as Record<string, unknown> : null
    const fileUrl = row.fileUrl || row.designFileUrl || receipt?.imageUrl
    if (!fileUrl) return
    try {
      const key = new URL(String(fileUrl)).pathname.replace(/^\//, '')
      const signed = await getData<{ downloadUrl: string }>(`/storage/presigned-download?objectKey=${encodeURIComponent(key)}`)
      window.open(signed.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (cause) { setError(errorMessage(cause)) }
  }

  async function addReceipt(event: React.FormEvent) {
    event.preventDefault()
    if (!receiptExpenseId || !receiptUrl) return
    setSaving(true)
    try {
      await postData(`/events/${eventId}/expenses/${receiptExpenseId}/receipts`, { imageUrl: receiptUrl })
      setReceiptExpenseId(null)
      setReceiptUrl('')
      toast('Đã thêm hóa đơn')
      await load()
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setSaving(false) }
  }

  if (!def) return <div className="panel">Không tìm thấy phân hệ.</div>
  if (missingScope) return <div className="panel"><h1 className="text-xl font-bold">Chọn mùa sự kiện trước</h1><p className="mt-2 text-slate-500">Tạo hoặc chọn một mùa sự kiện trong menu phía trên.</p><Link to="/data/events" className="btn-primary mt-4 inline-block">Đến danh sách mùa</Link></div>

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">Project F / {currentEvent?.seasonName || 'Câu lạc bộ'}</p><h1 className="page-title">{def.title}</h1><p className="muted">{def.description}</p></div>
      <button className="btn-primary" onClick={() => { setOpen(!open); setEditing(null); setValues({}) }}>{open ? 'Đóng form' : '+ Thêm mới'}</button>
    </div>

    {resourceKey === 'feedbacks' && feedbackSummary && <div className="grid gap-4 md:grid-cols-2"><div className="panel"><p className="muted">Số phản hồi</p><p className="mt-2 text-3xl font-bold">{feedbackSummary.responseCount}</p></div><div className="panel"><p className="muted">Điểm trung bình</p><p className="mt-2 text-3xl font-bold">{feedbackSummary.averageRating === null ? '—' : Number(feedbackSummary.averageRating).toFixed(1)} / 5</p></div></div>}

    {open && <form onSubmit={(event) => void save(event)} className="panel space-y-5">
      <h2 className="text-lg font-semibold">{editing ? 'Cập nhật' : 'Thêm'} {def.title.toLowerCase()}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {def.fields.map((field) => <label key={field.key} className="space-y-1 text-sm font-medium text-slate-700">
          <span>{field.label}{field.required && <span className="text-red-500"> *</span>}</span>
          <FieldInput field={field} value={values[field.key] || ''} options={options[field.key] || []}
            onChange={(value) => setValues((before) => ({ ...before, [field.key]: value }))} />
        </label>)}
      </div>
      <button disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button>
    </form>}

    {resourceKey === 'expenses' && receiptExpenseId && <form onSubmit={(event) => void addReceipt(event)} className="panel space-y-4">
      <h2 className="text-lg font-semibold">Thêm hóa đơn cho khoản chi</h2>
      <FileUploader category="RECEIPT" value={receiptUrl} onChange={setReceiptUrl} />
      <div className="flex gap-3"><button className="btn-primary" disabled={!receiptUrl || saving}>Lưu hóa đơn</button><button type="button" className="btn-secondary" onClick={() => { setReceiptExpenseId(null); setReceiptUrl('') }}>Hủy</button></div>
    </form>}

    <section className="panel">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Danh sách</h2>
        <input aria-label="Tìm kiếm" placeholder="Tìm kiếm..." value={keyword} onChange={(e) => { setPage(0); setKeyword(e.target.value) }} className="input max-w-xs" />
        {resourceKey === 'members' && <select aria-label="Lọc theo ban" className="input max-w-xs" value={filter} onChange={(e) => { setPage(0); setFilter(e.target.value) }}><option value="">Tất cả ban</option>{['HR', 'PLAN', 'MEDIA', 'ACADEMIC'].map((value) => <option key={value}>{value}</option>)}</select>}
        {resourceKey === 'events' && <select aria-label="Lọc theo trạng thái" className="input max-w-xs" value={filter} onChange={(e) => { setPage(0); setFilter(e.target.value) }}><option value="">Tất cả trạng thái</option>{['PLANNING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select>}
      </div>
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error} <button className="ml-3 underline" onClick={() => void load()}>Thử lại</button></div>}
      {loading ? <div className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        : items.length === 0 ? <div className="py-16 text-center text-slate-500">Chưa có dữ liệu. Bấm “Thêm mới” để bắt đầu.</div>
          : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-slate-500">
            {def.columns.map((key) => <th key={key} className="px-3 py-3 font-medium">{def.fields.find((f) => f.key === key)?.label || key}</th>)}
            <th className="px-3 py-3">Thao tác</th>
          </tr></thead><tbody>{items.map((row) => <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
            {def.columns.map((key) => <td key={key} className="max-w-[250px] truncate px-3 py-4">{display(row[key])}</td>)}
            <td className="whitespace-nowrap px-3 py-4">
              {['members', 'series', 'events'].includes(resourceKey) && <button className="action" onClick={() => navigate(resourceKey === 'members' ? `/members/${row.id}` : resourceKey === 'series' ? `/series/${row.id}` : `/events/${row.id}`)}>Chi tiết</button>}
              {['members', 'events', 'benchmarks'].includes(resourceKey) && <button className="action ml-3" onClick={() => beginEdit(row)}>Sửa</button>}
              {['documents', 'media', 'expenses', 'feedbacks'].includes(resourceKey) && <button className="action ml-3" onClick={() => void openFile(row)}>Xem tệp</button>}
              {resourceKey === 'expenses' && <button className="action ml-3" onClick={() => { setReceiptExpenseId(row.id); setReceiptUrl('') }}>Thêm hóa đơn</button>}
              {def.actions?.map((action) => <button key={action.label} className="action ml-3" onClick={() => void act(action, row)}>{action.label}</button>)}
            </td>
          </tr>)}</tbody></table></div>}
      {totalPages > 1 && <div className="mt-5 flex items-center justify-end gap-3 text-sm"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-secondary">Trước</button><span>{page + 1}/{totalPages}</span><button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)} className="btn-secondary">Sau</button></div>}
    </section>
  </div>
}
