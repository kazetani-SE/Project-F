import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import { useAuth } from '../../context/authContext';
import { AuthCard } from '../../pages/auth/AuthCard';
import { Loading, RetryNotice } from '../ui/CrudUi';
import { LogoutButton } from './LogoutButton';

export function RequireAuth() {
    const auth = useAuth();
    const { pathname, search, hash } = useLocation();
    if (auth.isLoading) return <AuthCard title="Đang xác thực"><Loading /></AuthCard>;
    if (auth.recovery) return <Navigate to={ROUTE_PATHS.RESET_PASSWORD} replace />;
    if (auth.error?.status === 403) return <Navigate to={ROUTE_PATHS.FORBIDDEN} replace />;
    if (auth.error && auth.error.status !== 401) {
        return <AuthCard title="Không tải được hồ sơ">
            <RetryNotice error={auth.error} onRetry={auth.retry} />
            <LogoutButton />
        </AuthCard>;
    }
    if (!auth.user) return <Navigate to={ROUTE_PATHS.LOGIN} replace state={{ from: pathname + search + hash }} />;
    return <Outlet />;
}
