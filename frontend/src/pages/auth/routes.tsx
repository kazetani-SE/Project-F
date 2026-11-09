import type { RouteObject } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import { LoginPage } from './LoginPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { ForbiddenPage } from './ForbiddenPage';

export const authRoutes: RouteObject[] = [
    { path: ROUTE_PATHS.LOGIN, element: <LoginPage /> },
    { path: ROUTE_PATHS.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
    { path: ROUTE_PATHS.RESET_PASSWORD, element: <ResetPasswordPage /> },
    { path: ROUTE_PATHS.FORBIDDEN, element: <ForbiddenPage /> },
];
