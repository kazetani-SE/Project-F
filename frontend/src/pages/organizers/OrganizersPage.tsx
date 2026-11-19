import { useParams } from 'react-router-dom';
import { OrganizerSection } from '../../components/organizers/OrganizerSection';
import { isClubAdmin, useAuth } from '../../context/authContext';

export function OrganizersPage() {
    const { eventId = '' } = useParams();
    const { user } = useAuth();
    return <OrganizerSection key={eventId} eventId={eventId} admin={isClubAdmin(user?.clubRole)} />;
}
