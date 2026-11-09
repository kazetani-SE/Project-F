import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './components/ui/ToastProvider';
import { RequireAuth } from './components/layout/RequireAuth';
import MainLayout from './components/layout/MainLayout';
import { ROUTE_PATHS } from './app/router/route';
import { shellRoutes } from './app/router';
import { authRoutes } from './pages/auth/routes';
import { eventRoutes } from './pages/events/routes';
import { memberRoutes } from './pages/members/routes';
import { organizerRoutes } from './pages/organizers/routes';

const router = createBrowserRouter([
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

export default function App() {
    return <AuthProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></AuthProvider>;
}
