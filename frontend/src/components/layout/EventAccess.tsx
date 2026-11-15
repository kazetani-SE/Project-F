import { Link, Navigate, Outlet, useParams } from 'react-router-dom';
import { ErrorNotice, link, Loading, secondary } from '../ui/CrudUi';
import { useActiveEvent } from '../../context/activeEventContext';
import { ROUTE_PATHS } from '../../app/router/route';

export default function EventAccess() {
    const { eventId } = useParams();
    const { currentEventId, roleStatus, error, retry } = useActiveEvent();
    if (currentEventId !== eventId || roleStatus === 'checking') return <Loading />;
    if (error && error.status !== 403) return <div className="space-y-3">
        <ErrorNotice error={error} />
        {error?.status !== 404 && <button className={secondary} onClick={retry}>Thử lại</button>}
        <Link className={link} to={ROUTE_PATHS.EVENTS}>Về danh sách sự kiện</Link>
    </div>;
    if (roleStatus === 'denied') return <Navigate to={ROUTE_PATHS.FORBIDDEN} replace />;
    return <Outlet />;
}
