import { createContext, useContext } from 'react';
import type {AuthUser} from "../types/models/auth.ts";
export interface AuthState { user: AuthUser | null; isLoading: boolean }
export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}