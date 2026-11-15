import { Link, Navigate, useLocation } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import { useAuth } from '../../context/authContext';
import { useMutation } from '../../hooks/useMutation';
import { button, ErrorNotice, field, link } from '../../components/ui/CrudUi';
import { useMock } from '../../services/supabaseClient';
import { AuthCard } from './AuthCard';

function redirectPath(state: unknown) {
    const from = (state as { from?: string } | null)?.from;
    return from?.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\') ? from : ROUTE_PATHS.EVENTS;
}

export function LoginPage() {
    const auth = useAuth();
    const { state } = useLocation();
    const { busy, error, mutate } = useMutation();
    if (auth.recovery) return <Navigate to={ROUTE_PATHS.RESET_PASSWORD} replace />;
    if (auth.user) return <Navigate to={redirectPath(state)} replace />;
    if (auth.error?.status === 403) return <Navigate to={ROUTE_PATHS.FORBIDDEN} replace />;
    if (auth.error && auth.error.status !== 401) return <Navigate to={ROUTE_PATHS.EVENTS} replace />;
    return <AuthCard title="Đăng nhập">
        {state?.passwordUpdated && <p role="status">Đã cập nhật mật khẩu. Hãy đăng nhập lại.</p>}
        {auth.error?.status === 401 && <ErrorNotice error={auth.error} />}
        <ErrorNotice error={error} />
        <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            void mutate(() => auth.signIn(String(values.get('email')).trim(), String(values.get('password'))));
        }}>
            <label className="block">Email
                <input className={field} type="email" name="email" autoComplete="username" required={!useMock} />
            </label>
            <label className="block">Mật khẩu
                <input className={field} type="password" name="password" autoComplete="current-password" required={!useMock} />
            </label>
            <button className={button} disabled={busy || auth.isLoading}>{useMock ? 'Đăng nhập thử' : 'Đăng nhập'}</button>
        </form>
        {!useMock && <Link className={link} to={ROUTE_PATHS.FORGOT_PASSWORD}>Quên mật khẩu?</Link>}
    </AuthCard>;
}
