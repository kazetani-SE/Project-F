// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, type AuthState } from '../../src/context/authContext';
import { LoginPage } from '../../src/pages/auth/LoginPage';
import { ResetPasswordPage } from '../../src/pages/auth/ResetPasswordPage';
import { RequireAuth } from '../../src/components/layout/RequireAuth';
import { RequireAdmin } from '../../src/components/layout/RequireAdmin';
import { statusOptions } from '../../src/pages/events/statusOptions';

afterEach(cleanup);

function auth(overrides: Partial<AuthState> = {}): AuthState {
    return {
        user: null, isLoading: false, error: null, recovery: false,
        signIn: vi.fn(), signOut: vi.fn(), sendReset: vi.fn(), updatePassword: vi.fn(), retry: vi.fn(),
        ...overrides,
    };
}

function renderRoute(path: string, state: AuthState) {
    render(<AuthContext value={state}><MemoryRouter initialEntries={[path]}>
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/403" element={<p>Access denied</p>} />
            <Route element={<RequireAuth />}>
                <Route path="/events" element={<p>Events dashboard</p>} />
                <Route element={<RequireAdmin />}>
                    <Route path="/members/new" element={<p>Create member</p>} />
                </Route>
            </Route>
        </Routes>
    </MemoryRouter></AuthContext>);
}

describe('access and authentication', () => {
    it('redirects unauthenticated deep links and submits email and password', async () => {
        const signIn = vi.fn().mockResolvedValue(undefined);
        renderRoute('/events', auth({ signIn }));
        const input = userEvent.setup();
        await input.type(screen.getByLabelText('Email'), 'member@example.com');
        await input.type(screen.getByLabelText('Mật khẩu'), 'secret12');
        await input.click(screen.getByRole('button', { name: 'Đăng nhập' }));
        expect(signIn).toHaveBeenCalledWith('member@example.com', 'secret12');
    });

    it('directs a club member away from a write-only route', () => {
        renderRoute('/members/new', auth({ user: {
            id: 'member-id', fullName: 'An', email: 'an@example.com', clubRole: 'MEMBER',
        } }));
        expect(screen.getByText('Access denied')).toBeTruthy();
    });

    it('requires a recovery session before offering password reset', () => {
        renderRoute('/reset-password', auth());
        expect(screen.getByText(/Liên kết đặt lại mật khẩu/)).toBeTruthy();
        expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
    });
});

it('offers only valid event status transitions', () => {
    expect(statusOptions('PLANNING')).toEqual(['APPROVED', 'CANCELLED']);
    expect(statusOptions('APPROVED')).toEqual(['IN_PROGRESS', 'CANCELLED']);
    expect(statusOptions('IN_PROGRESS')).toEqual(['COMPLETED', 'CANCELLED']);
    expect(statusOptions('COMPLETED')).toEqual([]);
    expect(statusOptions('CANCELLED')).toEqual([]);
});
