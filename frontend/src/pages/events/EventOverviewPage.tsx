import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loading, RetryNotice } from '../../components/ui/CrudUi';
import { EventOverview } from '../../components/events/EventOverview';
import { useActiveEvent } from '../../context/activeEventContext';
import { useResource } from '../../hooks/useResource';
import { eventService } from '../../services/eventService';

export function EventOverviewPage() {
    const { eventId = '' } = useParams();
    const { refreshEvents } = useActiveEvent();
    const resource = useResource(useCallback(() => eventService.get(eventId), [eventId]));
    if (resource.isLoading) return <Loading />;
    if (!resource.data) return <RetryNotice error={resource.error} onRetry={resource.reload} />;
    return <EventOverview key={eventId} event={resource.data} onSaved={(event) => {
        resource.replace(event);
        refreshEvents?.();
    }} />;
}
