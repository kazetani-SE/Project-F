import type { RouteObject } from 'react-router-dom';
import { ROUTE_PATHS } from './route';
import { LoginPage } from '../../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../pages/auth/ResetPasswordPage';
import { ForbiddenPage } from '../../pages/auth/ForbiddenPage';

export const authRoutes: RouteObject[] = [
    { path: ROUTE_PATHS.LOGIN, element: <LoginPage /> },
    { path: ROUTE_PATHS.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
    { path: ROUTE_PATHS.RESET_PASSWORD, element: <ResetPasswordPage /> },
    { path: ROUTE_PATHS.FORBIDDEN, element: <ForbiddenPage /> },
];
