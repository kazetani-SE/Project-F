import { Navigate, type RouteObject } from 'react-router-dom';
import { ROUTE_PATHS } from './route';
import { RequireAdmin } from '../../components/layout/RequireAdmin';
import { EventOverviewPage } from '../../pages/events/EventOverviewPage';
import { EventsPage } from '../../pages/events/EventsPage';
import { NewEventPage } from '../../pages/events/NewEventPage';
import { SeriesDetailPage } from '../../pages/events/SeriesDetailPage';
import { SeriesPage } from '../../pages/events/SeriesPage';

export const eventRoutes: RouteObject[] = [
    { path: ROUTE_PATHS.EVENTS, element: <EventsPage /> },
    { path: ROUTE_PATHS.SERIES, element: <SeriesPage /> },
    { path: ROUTE_PATHS.SERIES_DETAIL, element: <SeriesDetailPage /> },
    {
        element: <RequireAdmin />,
        children: [{ path: ROUTE_PATHS.EVENT_NEW, element: <NewEventPage /> }],
    },
    { path: ROUTE_PATHS.EVENT_DETAIL, element: <Navigate to="overview" replace /> },
    { path: ROUTE_PATHS.EVENT_OVERVIEW, element: <EventOverviewPage /> },
];
