// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { AuthContext } from '../../src/context/authContext';
import { ActiveEventProvider } from '../../src/context/ActiveEventProvider';
import { STORAGE_KEY_ACTIVE_EVENT } from '../../src/constants/enum/role';
import { shellService } from '../../src/services/shellService';

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

it('clears a stored event that is not available without requesting its role', async () => {
    localStorage.setItem(STORAGE_KEY_ACTIVE_EVENT, 'invalid-event-id');
    vi.spyOn(shellService, 'listEvents').mockResolvedValue([]);
    const fetchRole = vi.spyOn(shellService, 'fetchRole').mockResolvedValue(null);

    const auth = {
        user: { id: 'member', fullName: 'Test Member', email: 'member@example.com', clubRole: 'MEMBER' as const },
        isLoading: false, error: null, recovery: false,
        signIn: vi.fn(), signOut: vi.fn(), sendReset: vi.fn(), updatePassword: vi.fn(), retry: vi.fn(),
    };
    render(<AuthContext value={auth}><ActiveEventProvider><p>App</p></ActiveEventProvider></AuthContext>);

    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY_ACTIVE_EVENT)).toBeNull());
    expect(fetchRole).not.toHaveBeenCalled();
});
