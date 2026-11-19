import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from '../../components/layout/RequireAuth';
import MainLayout from '../../components/layout/MainLayout';
import { authRoutes } from './auth';
import { eventRoutes } from './events';
import { memberRoutes } from './members';
import { organizerRoutes } from './organizers';
import { ROUTE_PATHS } from './route';
import { shellRoutes } from './shell';

// Các route công khai nằm ngoài RequireAuth; mọi trang nghiệp vụ dùng chung MainLayout.
export const router = createBrowserRouter([
    ...authRoutes,
    {
        element: <RequireAuth />,
        children: [{
            path: ROUTE_PATHS.ROOT,
            element: <MainLayout />,
            children: [...memberRoutes, ...eventRoutes, ...organizerRoutes, ...shellRoutes],
        }],
    },
]);
