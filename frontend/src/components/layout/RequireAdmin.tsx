import { Navigate, Outlet } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import { isClubAdmin, useAuth } from '../../context/authContext';

export function RequireAdmin() {
    const { user } = useAuth();
    return isClubAdmin(user?.clubRole) ? <Outlet /> : <Navigate to={ROUTE_PATHS.FORBIDDEN} replace />;
}
