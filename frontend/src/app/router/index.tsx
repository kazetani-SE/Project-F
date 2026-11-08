import { createBrowserRouter, Link, Navigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import EventAccess from '../../components/layout/EventAccess';
import { ForbiddenPage, ForgotPasswordPage, LoginPage, RequireAdmin, RequireAuth, ResetPasswordPage } from '../../pages/auth/AuthPages';
import { EventOverviewPage, EventsPage, NewEventPage } from '../../pages/events/EventPages';
import { SeriesDetailPage, SeriesPage } from '../../pages/events/SeriesPages';
import { MemberDetailPage, MembersPage, NewMemberPage } from '../../pages/members/MemberPages';
import DocumentsPage from '../../pages/documents/DocumentsPage';
import KnowledgePage from '../../pages/knowledge/KnowledgePage';

export const router = createBrowserRouter([
    { path: '/login', element: <LoginPage /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
    { path: '/403', element: <ForbiddenPage /> },
    {
        element: <RequireAuth />,
        children: [{
            path: '/',
            element: <MainLayout />,
            children: [
                { index: true, element: <Navigate to="/events" replace /> },
                { path: 'members', element: <MembersPage /> },
                { path: 'members/:id', element: <MemberDetailPage /> },
                { path: 'series', element: <SeriesPage /> },
                { path: 'series/:id', element: <SeriesDetailPage /> },
                { path: 'events', element: <EventsPage /> },
                {
                    element: <RequireAdmin />,
                    children: [
                        { path: 'members/new', element: <NewMemberPage /> },
                        { path: 'events/new', element: <NewEventPage /> },
                    ],
                },
                {
                    path: 'events/:eventId',
                    element: <EventAccess />,
                    children: [
                        { index: true, element: <Navigate to="overview" replace /> },
                        { path: 'overview', element: <EventOverviewPage /> },
                        { path: 'documents', element: <DocumentsPage /> },
                        { path: 'knowledge', element: <KnowledgePage /> },
                    ],
                },
                { path: '*', element: <p>Không tìm thấy trang. <Link className="text-emerald-700 underline" to="/events">Về danh sách sự kiện</Link></p> },
            ],
        }],
    },
]);
