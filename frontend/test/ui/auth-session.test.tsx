// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosAdapter } from 'axios';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthProvider';
import { apiClient, setAccessToken } from '../../src/services/apiClient';
import { LogoutButton } from '../../src/components/layout/LogoutButton';
import { RequireAuth } from '../../src/components/layout/RequireAuth';
import type { AuthUser } from '../../src/types/models/auth';

const mock = vi.hoisted(() => ({
    listener: null as ((event: AuthChangeEvent, session: Session | null) => void) | null,
}));

vi.mock('../../src/services/supabaseClient', () => {
    const auth = {
        onAuthStateChange(callback: typeof mock.listener) {
            mock.listener = callback;
            return { data: { subscription: { unsubscribe: () => { mock.listener = null; } } } };
        },
        async signOut() {
            mock.listener?.('SIGNED_OUT', null);
            return { error: null };
        },
    };
    return { useMock: false, supabase: { auth }, requireSupabase: () => ({ auth }) };
});

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => {
    cleanup();
    apiClient.defaults.adapter = originalAdapter;
    setAccessToken(null);
    sessionStorage.clear();
});

function renderProtected() {
    render(<AuthProvider><MemoryRouter initialEntries={['/events']}>
        <Routes>
            <Route path="/login" element={<p>Login route</p>} />
            <Route path="/403" element={<p>Forbidden route</p>} />
            <Route element={<RequireAuth />}>
                <Route path="/events" element={<LogoutButton />} />
            </Route>
        </Routes>
    </MemoryRouter></AuthProvider>);
}

const profile: AuthUser = { id: 'member', fullName: 'An', email: 'an@example.com', clubRole: 'MEMBER' };
const session = (token: string) => ({ access_token: token, user: { id: 'auth-id' } }) as Session;

it('restores the session, applies refreshed bearer tokens, and clears the token on logout', async () => {
    const adapter = vi.fn<AxiosAdapter>().mockImplementation(async (config) => ({
        data: { success: true, data: profile }, status: 200, statusText: 'OK', headers: {}, config,
    }));
    apiClient.defaults.adapter = adapter;
    renderProtected();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).toBeNull();

    act(() => mock.listener?.('INITIAL_SESSION', session('initial-token')));
    const logout = await screen.findByRole('button', { name: 'Đăng xuất' });
    expect(adapter.mock.calls[0][0].url).toBe('/auth/me');
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer initial-token');

    act(() => mock.listener?.('TOKEN_REFRESHED', session('refreshed-token')));
    await apiClient.get('/events');
    expect(adapter.mock.calls[1][0].headers.get('Authorization')).toBe('Bearer refreshed-token');

    await userEvent.click(logout);
    expect(await screen.findByText('Login route')).toBeTruthy();
    await apiClient.get('/events');
    expect(adapter.mock.calls[2][0].headers.get('Authorization')).toBeUndefined();
});
