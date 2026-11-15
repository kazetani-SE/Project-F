import { createContext, useContext } from 'react';
import type { AuthUser, ClubRole } from '../types/models/auth';
import type { ApiError } from '../types/common/api';

export interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;
    error: ApiError | null;
    recovery: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    sendReset: (email: string) => Promise<void>;
    updatePassword: (password: string) => Promise<void>;
    retry: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);
export const isClubAdmin = (role?: ClubRole) => role === 'PRESIDENT' || role === 'VICEPRESIDENT';

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
