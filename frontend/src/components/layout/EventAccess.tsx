import { Link, Navigate, Outlet, useParams } from 'react-router-dom';
import { ErrorNotice, link, Loading, secondary } from '../ui/CrudUi';
import { useActiveEvent } from '../../context/activeEventContext';

export default function EventAccess() {
    const { eventId } = useParams();
    const { currentEventId, roleStatus, error, retry } = useActiveEvent();
    if (currentEventId !== eventId || roleStatus === 'checking') return <Loading />;
    if (roleStatus === 'denied') return <Navigate to="/403" replace />;
    if (roleStatus === 'error') return <div className="space-y-3">
        <ErrorNotice error={error} />
        {error?.status !== 404 && <button className={secondary} onClick={retry}>Thử lại</button>}
        <Link className={link} to="/events">Về danh sách sự kiện</Link>
    </div>;
    return <Outlet />;
}
