import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import { useAuth } from '../../context/authContext';
import { link } from '../../components/ui/CrudUi';
import { LogoutButton } from '../../components/layout/LogoutButton';
import { AuthCard } from './AuthCard';

export function ForbiddenPage() {
    const { user, error } = useAuth();
    return <AuthCard title="Không có quyền truy cập">
        <p>{error?.status === 403 ? 'Tài khoản chưa được cấp quyền hoặc đã ngừng hoạt động.' : 'Tài khoản của bạn không có quyền truy cập trang này.'}</p>
        {user && <Link className={link} to={ROUTE_PATHS.EVENTS}>Về danh sách sự kiện</Link>}
        {(user || error) ? <LogoutButton /> : <Link className={link} to={ROUTE_PATHS.LOGIN}>Đăng nhập</Link>}
    </AuthCard>;
}
