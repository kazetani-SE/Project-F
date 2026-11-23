import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/CrudUi';
import { EventForm } from './components/EventForm';
import { useSuccessToast } from '../../components/ui/toastContext';
import { ROUTE_PATHS, ROUTES } from '../../app/router/route';
import { useActiveEvent } from '../../context/activeEventContext';
import { eventService } from '../../services/eventService';

export function NewEventPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { refreshEvents } = useActiveEvent();
    const notify = useSuccessToast();
    return <section className="space-y-5">
        <PageHeader title="Tạo sự kiện" />
        <EventForm seriesId={params.get('seriesId') ?? undefined} onCancel={() => navigate(ROUTE_PATHS.EVENTS)} onSave={async (data) => {
            const event = await eventService.create(data);
            refreshEvents?.();
            notify('Đã tạo sự kiện.');
            navigate(ROUTES.overview(event.id));
        }} />
    </section>;
}
