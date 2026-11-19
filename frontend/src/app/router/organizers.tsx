import type { RouteObject } from 'react-router-dom';
import { ROUTE_PATHS } from './route';
import EventAccess from '../../components/layout/EventAccess';
import { OrganizersPage } from '../../pages/organizers/OrganizersPage';

export const organizerRoutes: RouteObject[] = [{
    element: <EventAccess />,
    children: [{ path: ROUTE_PATHS.EVENT_ORGANIZERS, element: <OrganizersPage /> }],
}];
