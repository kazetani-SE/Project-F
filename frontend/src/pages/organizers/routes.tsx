import type { RouteObject } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import EventAccess from '../../components/layout/EventAccess';
import { OrganizersPage } from './OrganizerSection';

export const organizerRoutes: RouteObject[] = [{
    element: <EventAccess />,
    children: [{ path: ROUTE_PATHS.EVENT_ORGANIZERS, element: <OrganizersPage /> }],
}];
