import type { RouteObject } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import { RequireAdmin } from '../../components/layout/RequireAdmin';
import { MembersPage, MemberDetailPage, NewMemberPage } from './MemberPages';

export const memberRoutes: RouteObject[] = [
    { path: ROUTE_PATHS.MEMBERS, element: <MembersPage /> },
    { path: ROUTE_PATHS.MEMBER_DETAIL, element: <MemberDetailPage /> },
    {
        element: <RequireAdmin />,
        children: [{ path: ROUTE_PATHS.MEMBER_NEW, element: <NewMemberPage /> }],
    },
];
