import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { button, field, link, ErrorNotice, Loading } from '../../components/ui/CrudUi';
import { useMock } from '../../services/supabaseClient';

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
    return <main className="grid min-h-screen place-items-center bg-canvas p-4">
        <section className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
                <p className="text-sm font-semibold text-emerald-700">Project F</p>
                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            </div>
            {children}
        </section>
    </main>;
}

function useSubmit() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);

    async function submit(event: FormEvent<HTMLFormElement>, action: (values: FormData) => Promise<void>) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await action(new FormData(event.currentTarget));
        } catch (error) {
            setError(error);
        } finally {
            setBusy(false);
        }
    }

    return { busy, error, submit };
}

function redirectPath(state: unknown) {
    const from = (state as { from?: string } | null)?.from;
    return from?.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\') ? from : '/events';
}

export function RequireAuth() {
    const auth = useAuth();
    const { pathname, search, hash } = useLocation();
    if (auth.isLoading) return <AuthCard title="Đang xác thực"><Loading /></AuthCard>;
    if (auth.recovery) return <Navigate to="/reset-password" replace />;
    if (auth.error?.status === 403) return <Navigate to="/403" replace />;
    if (auth.error && auth.error.status !== 401) {
        return <AuthCard title="Không tải được hồ sơ">
            <ErrorNotice error={auth.error} />
            <button className={button} onClick={auth.retry}>Thử lại</button>
            <LogoutButton />
        </AuthCard>;
    }
    if (!auth.user) return <Navigate to="/login" replace state={{ from: pathname + search + hash }} />;
    return <Outlet />;
}

export function RequireAdmin() {
    const { user } = useAuth();
    return isClubAdmin(user?.clubRole) ? <Outlet /> : <Navigate to="/403" replace />;
}

export function LoginPage() {
    const auth = useAuth();
    const { state } = useLocation();
    const { busy, error, submit } = useSubmit();
    if (auth.recovery) return <Navigate to="/reset-password" replace />;
    if (auth.user) return <Navigate to={redirectPath(state)} replace />;
    if (auth.error?.status === 403) return <Navigate to="/403" replace />;
    if (auth.error && auth.error.status !== 401) return <Navigate to="/events" replace />;
    return <AuthCard title="Đăng nhập">
        {state?.passwordUpdated && <p role="status">Đã cập nhật mật khẩu. Hãy đăng nhập lại.</p>}
        {auth.error?.status === 401 && <ErrorNotice error={auth.error} />}
        <ErrorNotice error={error} />
        <form className="space-y-4" onSubmit={(event) => void submit(event, async (values) => {
            await auth.signIn(String(values.get('email')).trim(), String(values.get('password')));
        })}>
            <label className="block">Email
                <input className={field} type="email" name="email" autoComplete="username" required={!useMock} />
            </label>
            <label className="block">Mật khẩu
                <input className={field} type="password" name="password" autoComplete="current-password" required={!useMock} />
            </label>
            <button className={button} disabled={busy || auth.isLoading}>{useMock ? 'Đăng nhập thử' : 'Đăng nhập'}</button>
        </form>
        {!useMock && <Link className={link} to="/forgot-password">Quên mật khẩu?</Link>}
    </AuthCard>;
}

export function ForgotPasswordPage() {
    const { sendReset } = useAuth();
    const [sent, setSent] = useState(false);
    const { busy, error, submit } = useSubmit();
    return <AuthCard title="Quên mật khẩu">
        <ErrorNotice error={error} />
        {sent ? <p role="status">Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu.</p> :
            <form className="space-y-4" onSubmit={(event) => void submit(event, async (values) => {
                await sendReset(String(values.get('email')).trim());
                setSent(true);
            })}>
                <label className="block">Email<input className={field} name="email" type="email" autoComplete="email" required /></label>
                <button className={button} disabled={busy}>Gửi liên kết đặt lại</button>
            </form>}
        <Link className={link} to="/login">Quay lại đăng nhập</Link>
    </AuthCard>;
}

export function ResetPasswordPage() {
    const { recovery, isLoading, updatePassword } = useAuth();
    const navigate = useNavigate();
    const { busy, error, submit } = useSubmit();
    return <AuthCard title="Đặt lại mật khẩu">
        {isLoading ? <Loading /> : (recovery || busy) ? <>
            <ErrorNotice error={error} />
            <form className="space-y-4" onSubmit={(event) => void submit(event, async (values) => {
                const password = String(values.get('password'));
                if (password !== values.get('confirm')) throw new Error('Mật khẩu xác nhận không khớp.');
                await updatePassword(password);
                navigate('/login', { replace: true, state: { passwordUpdated: true } });
            })}>
                <label className="block">Mật khẩu mới<input className={field} type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
                <label className="block">Xác nhận mật khẩu<input className={field} type="password" name="confirm" autoComplete="new-password" minLength={8} required /></label>
                <button className={button} disabled={busy}>Lưu mật khẩu</button>
            </form>
        </> : <>
            <p>Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
            <Link className={link} to="/forgot-password">Yêu cầu liên kết mới</Link>
        </>}
    </AuthCard>;
}

export function LogoutButton() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    return <div>
        <button className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50" disabled={busy}
            onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                    await signOut();
                    navigate('/login', { replace: true });
                } catch (error) {
                    setError(error);
                } finally {
                    setBusy(false);
                }
            }}>Đăng xuất</button>
        <ErrorNotice error={error} />
    </div>;
}

export function ForbiddenPage() {
    const { user, error } = useAuth();
    return <AuthCard title="Không có quyền truy cập">
        <p>{error?.status === 403 ? 'Tài khoản chưa được cấp quyền hoặc đã ngừng hoạt động.' : 'Tài khoản của bạn không có quyền truy cập trang này.'}</p>
        {user && <Link className={link} to="/events">Về danh sách sự kiện</Link>}
        {(user || error) ? <LogoutButton /> : <Link className={link} to="/login">Đăng nhập</Link>}
    </AuthCard>;
}
