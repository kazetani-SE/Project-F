import { useEffect, useState } from 'react'
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { CalendarDays, ChartNoAxesCombined, FileText, HelpCircle, LayoutDashboard, LogOut, Menu, ReceiptText, ShieldCheck, Users, X } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ActiveEventProvider, useActiveEvent } from './context/ActiveEventContext'
import { UiProvider, useUi } from './context/UiContext'
import { errorMessage, getData, patchData, postData } from './services/apiClient'
import { supabase } from './services/supabase'
import type { EventSeason, Row } from './types/api'
import ResourcePage from './pages/ResourcePage'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!supabase) return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white"><div className="max-w-lg rounded-2xl bg-slate-900 p-8"><h1 className="text-3xl font-bold">Project F</h1><p className="mt-4 text-slate-300">Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong frontend/.env.local, rồi chạy lại Vite.</p></div></div>
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    const { error: authError } = await supabase!.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setBusy(false)
  }
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#3730a3,#0f172a_60%)] p-6"><div className="w-full max-w-md rounded-3xl bg-white p-8 text-slate-900 shadow-2xl">
    <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">F</div>
    <p className="eyebrow">Hệ thống quản lý CLB</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Chào mừng đến Project F</h1>
    <p className="mt-2 text-slate-500">Đăng nhập bằng tài khoản Supabase Auth đã được liên kết với thành viên CLB.</p>
    <form onSubmit={(event) => void login(event)} className="mt-8 space-y-5">
      <label className="block text-sm font-medium">Email<input className="input mt-2" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="block text-sm font-medium">Mật khẩu<input className="input mt-2" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
    </form>
  </div></main>
}

const mainLinks = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/data/members', label: 'Thành viên', icon: Users },
  { to: '/data/series', label: 'Chuỗi sự kiện', icon: CalendarDays },
  { to: '/data/events', label: 'Mùa sự kiện', icon: CalendarDays },
]

function Layout() {
  const { member } = useAuth()
  const { events, currentEvent, setCurrentEvent } = useActiveEvent()
  const [mobileOpen, setMobileOpen] = useState(false)
  const id = currentEvent?.id || ''
  const eventLinks = id ? [
    { to: `/events/${id}`, label: 'Tổng quan mùa', icon: LayoutDashboard },
    { to: `/events/${id}/organizers`, label: 'Ban tổ chức', icon: Users },
    { to: `/events/${id}/finance/dashboard`, label: 'Dashboard tài chính', icon: ChartNoAxesCombined },
    { to: `/events/${id}/finance/budgets`, label: 'Dự trù', icon: ReceiptText },
    { to: `/events/${id}/finance/expenses`, label: 'Thực chi', icon: ReceiptText },
    { to: `/events/${id}/finance/projected`, label: 'Dự toán mùa mới', icon: ChartNoAxesCombined },
    { to: `/events/${id}/documents`, label: 'Tài liệu', icon: FileText },
    { to: `/events/${id}/media`, label: 'Ấn phẩm', icon: FileText },
    { to: `/events/${id}/knowledge/incidents`, label: 'Sự cố', icon: ShieldCheck },
    { to: `/events/${id}/knowledge/faqs`, label: 'FAQ', icon: HelpCircle },
    { to: `/events/${id}/knowledge/feedbacks`, label: 'Phản hồi', icon: HelpCircle },
  ] : []
  function nav(items: typeof mainLinks) {
    return items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)
  }
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:hidden"><button aria-label="Mở menu" onClick={() => setMobileOpen(true)}><Menu /></button><span className="font-bold">Project F</span><span className="text-sm text-slate-500">{member?.fullName}</span></header>
    {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><Link to="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-xl font-bold">F</span><span className="text-xl font-bold">Project F</span></Link><button className="lg:hidden" onClick={() => setMobileOpen(false)}><X /></button></div>
      <div className="p-5"><label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Mùa đang làm việc</label><select aria-label="Chọn mùa sự kiện" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white" value={id} onChange={(e) => { const chosen = events.find((item) => item.id === e.target.value); if (chosen) setCurrentEvent(chosen) }}><option value="">Chưa có mùa</option>{events.map((event) => <option key={event.id} value={event.id}>{event.seasonName}</option>)}</select></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-6"><p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Câu lạc bộ</p>{nav(mainLinks)}<p className="px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">Mùa sự kiện</p>{nav(eventLinks)}<p className="px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">Danh mục</p>{nav([{ to: '/data/categories', label: 'Danh mục chi', icon: ReceiptText }, { to: '/data/benchmarks', label: 'Bảng giá', icon: ReceiptText }])}</nav>
      <div className="border-t border-white/10 p-5"><p className="truncate font-medium">{member?.fullName}</p><p className="text-xs text-slate-400">{member?.clubRole}</p><button className="mt-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white" onClick={() => void supabase?.auth.signOut()}><LogOut size={16} />Đăng xuất</button></div>
    </aside>
    <main className="min-h-screen lg:pl-72"><div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-10"><Outlet /></div></main>
  </div>
}

function Dashboard() {
  const { currentEvent } = useActiveEvent()
  const { member } = useAuth()
  return <div className="space-y-8"><div><p className="eyebrow">Bảng điều khiển</p><h1 className="page-title">Xin chào, {member?.fullName || 'thành viên'} 👋</h1><p className="muted">Quản lý con người, sự kiện và nguồn lực của CLB trong một nơi.</p></div>
    <div className="grid gap-5 md:grid-cols-3"><div className="panel border-l-4 border-indigo-500"><p className="muted">Mùa đang làm việc</p><p className="mt-3 text-2xl font-bold">{currentEvent?.seasonName || 'Chưa chọn'}</p><p className="mt-2 text-sm text-slate-500">{currentEvent?.title}</p></div><div className="panel border-l-4 border-cyan-500"><p className="muted">Trạng thái</p><p className="mt-3 text-2xl font-bold">{currentEvent?.status || '—'}</p></div><div className="panel border-l-4 border-emerald-500"><p className="muted">Quỹ cấp phát</p><p className="mt-3 text-2xl font-bold">{currentEvent ? new Intl.NumberFormat('vi-VN').format(currentEvent.allocatedFund) : '—'} ₫</p></div></div>
    <div className="panel"><h2 className="text-lg font-bold">Bắt đầu nhanh</h2><div className="mt-4 flex flex-wrap gap-3"><Link className="btn-secondary" to="/data/members">Quản lý thành viên</Link><Link className="btn-secondary" to="/data/events">Mùa sự kiện</Link>{currentEvent && <Link className="btn-primary" to={`/events/${currentEvent.id}/finance`}>Xem ngân sách</Link>}</div></div>
  </div>
}

function Detail() {
  const { id, eventId } = useParams()
  const kind = eventId ? 'events' : location.pathname.startsWith('/members/') ? 'members' : 'event-series'
  const recordId = eventId || id
  const [row, setRow] = useState<Row | null>(null)
  const [error, setError] = useState('')
  const { toast, confirm } = useUi()
  const { reload } = useActiveEvent()
  useEffect(() => { if (recordId) void getData<Row>(`/${kind}/${recordId}`).then(setRow).catch((cause) => setError(errorMessage(cause))) }, [kind, recordId])
  async function status(next: string) {
    if (!eventId || !await confirm(`Chuyển sự kiện sang ${next}?`)) return
    try { const updated = await patchData<Row>(`/events/${eventId}/status`, { status: next }); setRow(updated); await reload(); toast('Đã cập nhật trạng thái') }
    catch (cause) { setError(errorMessage(cause)) }
  }
  return <div className="space-y-6"><div><p className="eyebrow">Chi tiết</p><h1 className="page-title">{String(row?.title || row?.fullName || row?.name || 'Đang tải...')}</h1></div>{error && <div role="alert" className="panel text-red-600">{error}</div>}
    {row && <div className="panel grid gap-4 md:grid-cols-2">{Object.entries(row).filter(([key]) => key !== 'events').map(([key, value]) => <div key={key} className="border-b border-slate-100 pb-3"><p className="text-xs uppercase tracking-wide text-slate-500">{key}</p><p className="mt-1 break-all font-medium">{String(value ?? '—')}</p></div>)}</div>}
    {eventId && row && <div className="panel"><h2 className="mb-4 font-bold">Vòng đời sự kiện</h2><div className="flex flex-wrap gap-3">{['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((next) => <button key={next} onClick={() => void status(next)} className="btn-secondary">{next}</button>)}</div></div>}
    {eventId && <div className="panel"><h2 className="mb-4 font-bold">Các phân hệ</h2><div className="flex flex-wrap gap-3">{['organizers', 'budgets', 'expenses', 'documents', 'media', 'incidents', 'faqs', 'feedbacks'].map((key) => <Link key={key} to={`/events/${eventId}/${key}`} className="btn-secondary">{key}</Link>)}</div></div>}
    {kind === 'event-series' && Array.isArray(row?.events) && <div className="panel"><h2 className="mb-3 font-bold">Các mùa đã tổ chức</h2>{(row.events as EventSeason[]).map((event) => <Link key={event.id} to={`/events/${event.id}`} className="block border-t py-3 text-indigo-700">{event.seasonName} — {event.title}</Link>)}</div>}
  </div>
}

function Insights({ kind }: { kind: 'finance' | 'projected' }) {
  const { eventId = '' } = useParams()
  const [data, setData] = useState<Row | Row[] | null>(null)
  const [error, setError] = useState('')
  const { confirm, toast } = useUi()
  const path = kind === 'finance' ? `/events/${eventId}/budget-summary` : `/events/${eventId}/projected-budget`
  useEffect(() => { void getData<Row | Row[]>(path).then(setData).catch((cause) => setError(errorMessage(cause))) }, [path])
  async function apply() {
    if (!await confirm('Áp dụng toàn bộ dự toán mùa trước vào mùa này?')) return
    try { await postData(`/events/${eventId}/apply-projected-budget`, {}); toast('Đã tạo dự trù'); setData([]) }
    catch (cause) { setError(errorMessage(cause)) }
  }
  return <div className="space-y-6"><div><p className="eyebrow">Tài chính</p><h1 className="page-title">{kind === 'finance' ? 'Tổng quan ngân sách' : 'Dự toán từ mùa trước'}</h1></div>
    {error && <div role="alert" className="panel text-red-600">{error}</div>}
    {data === null ? <div className="panel h-40 animate-pulse bg-slate-100" /> : Array.isArray(data)
      ? <div className="panel"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">{data.length} hạng mục đề xuất</h2><button className="btn-primary" disabled={!data.length} onClick={() => void apply()}>Áp dụng dự toán</button></div>{data.length ? data.map((row) => <div key={row.previousBudgetItemId as string} className="grid gap-2 border-t py-4 md:grid-cols-4"><span>{String(row.itemName)}</span><span>{String(row.baseQuantityForProjection)} {String(row.unit)}</span><span>{new Intl.NumberFormat('vi-VN').format(Number(row.currentAdjustedUnitPrice))} ₫</span><strong>{new Intl.NumberFormat('vi-VN').format(Number(row.projectedCurrentCost))} ₫</strong></div>) : <p className="muted">Chưa có mùa hoàn thành trước đó để gợi ý.</p>}</div>
      : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Object.entries(data).map(([key, value]) => <div key={key} className="panel"><p className="muted">{key}</p><p className="mt-3 text-2xl font-bold">{typeof value === 'number' ? new Intl.NumberFormat('vi-VN').format(value) : String(value)}</p></div>)}</div>}
  </div>
}

function GuardedApp() {
  const { session, member, loading } = useAuth()
  if (loading) return <div className="min-h-screen animate-pulse bg-slate-100" />
  if (!session) return <LoginPage />
  if (!member) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="panel max-w-lg"><h1 className="text-xl font-bold">Tài khoản chưa liên kết</h1><p className="mt-3 text-slate-600">Email đăng nhập cần trùng email của thành viên CLB đang hoạt động. Nhờ trưởng CLB tạo hồ sơ cho tài khoản này.</p><button className="btn-secondary mt-5" onClick={() => void supabase?.auth.signOut()}>Đăng xuất</button></div></div>
  return <ActiveEventProvider><UiProvider><Routes><Route element={<Layout />}>
    <Route index element={<Dashboard />} /><Route path="data/:resourceKey" element={<ResourcePage />} />
    <Route path="members/:id" element={<Detail />} /><Route path="series/:id" element={<Detail />} />
    <Route path="events/:eventId" element={<Detail />} />
      <Route path="events/:eventId/finance" element={<Insights kind="finance" />} />
      <Route path="events/:eventId/finance/dashboard" element={<Insights kind="finance" />} />
      <Route path="events/:eventId/projected" element={<Insights kind="projected" />} />
      <Route path="events/:eventId/finance/projected" element={<Insights kind="projected" />} />
      <Route path="events/:eventId/finance/:resourceKey" element={<ResourcePage />} />
      <Route path="events/:eventId/knowledge/:resourceKey" element={<ResourcePage />} />
    <Route path="events/:eventId/:resourceKey" element={<ResourcePage />} />
    <Route path="*" element={<Navigate to="/" />} />
  </Route></Routes></UiProvider></ActiveEventProvider>
}

export default function App() { return <BrowserRouter><AuthProvider><GuardedApp /></AuthProvider></BrowserRouter> }
