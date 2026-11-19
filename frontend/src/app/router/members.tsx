import type { RouteObject } from 'react-router-dom';
import { ROUTE_PATHS } from './route';
import { RequireAdmin } from '../../components/layout/RequireAdmin';
import { MembersPage } from '../../pages/members/MembersPage';
import { MemberDetailPage } from '../../pages/members/MemberDetailPage';
import { NewMemberPage } from '../../pages/members/NewMemberPage';

export const memberRoutes: RouteObject[] = [
    { path: ROUTE_PATHS.MEMBERS, element: <MembersPage /> },
    { path: ROUTE_PATHS.MEMBER_DETAIL, element: <MemberDetailPage /> },
    {
        element: <RequireAdmin />,
        children: [{ path: ROUTE_PATHS.MEMBER_NEW, element: <NewMemberPage /> }],
    },
];
