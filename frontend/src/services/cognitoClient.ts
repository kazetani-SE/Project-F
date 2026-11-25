export const useMock = Boolean(import.meta.env?.DEV && import.meta.env?.VITE_USE_MOCK === 'true');

export type AuthChangeEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'PASSWORD_RECOVERY';

export interface AuthSession {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    user: {
        id: string;
        email?: string;
    };
}

interface BackendEnvelope<T> {
    success: boolean;
    message?: string;
    errorCode?: string;
    data?: T;
}

interface AuthTokenPayload {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
}

type AuthListener = (event: AuthChangeEvent, session: AuthSession | null) => void;

const STORAGE_KEY = 'pf.cognito.session';
const RECOVERY_EMAIL_KEY = 'pf.cognito.recoveryEmail';
const baseUrl = useMock ? '/api/v1' : (import.meta.env?.VITE_API_BASE_URL ?? '/api/v1');

function decodeJwtPayload(token: string): { sub?: string; email?: string; exp?: number } {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return {};
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map((ch) => '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
        );
        return JSON.parse(json) as { sub?: string; email?: string; exp?: number };
    } catch {
        return {};
    }
}

async function postBackendAuth<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as BackendEnvelope<T>;
    if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Xác thực không thành công.');
    }
    return payload.data as T;
}

class BackendCognitoAuthService {
    private listeners = new Set<AuthListener>();
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;

    private loadStoredSession(): AuthSession | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw) as AuthSession;
        } catch {
            return null;
        }
    }

    private saveSession(session: AuthSession | null) {
        try {
            if (session) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // Ignore storage errors
        }
    }

    private notify(event: AuthChangeEvent, session: AuthSession | null) {
        for (const listener of this.listeners) {
            listener(event, session);
        }
    }

    private scheduleRefresh(session: AuthSession | null) {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        if (!session?.expires_at || !session.refresh_token) return;
        const delayMs = Math.max(15_000, session.expires_at * 1000 - Date.now() - 60_000);
        this.refreshTimer = setTimeout(() => {
            void this.refreshSession(session.refresh_token!, session.user.email);
        }, delayMs);
    }

    private buildSession(idToken: string, refreshToken?: string, fallbackEmail?: string): AuthSession {
        const claims = decodeJwtPayload(idToken);
        if (!claims.sub) {
            throw new Error('Token xác thực không chứa định danh người dùng (sub).');
        }
        return {
            access_token: idToken,
            refresh_token: refreshToken,
            expires_at: claims.exp,
            user: {
                id: claims.sub,
                email: claims.email ?? fallbackEmail,
            },
        };
    }

    async refreshSession(refreshToken: string, email?: string): Promise<AuthSession | null> {
        try {
            const data = await postBackendAuth<AuthTokenPayload>('/auth/refresh', {
                refreshToken,
                email,
            });
            const next = this.buildSession(data.accessToken, data.refreshToken ?? refreshToken, email);
            this.saveSession(next);
            this.scheduleRefresh(next);
            this.notify('TOKEN_REFRESHED', next);
            return next;
        } catch {
            this.saveSession(null);
            this.notify('SIGNED_OUT', null);
            return null;
        }
    }

    onAuthStateChange(callback: AuthListener) {
        this.listeners.add(callback);
        const existing = this.loadStoredSession();
        queueMicrotask(() => {
            if (!this.listeners.has(callback)) return;
            if (existing) {
                const expired = existing.expires_at && existing.expires_at * 1000 <= Date.now() + 30_000;
                if (expired && existing.refresh_token) {
                    void this.refreshSession(existing.refresh_token, existing.user.email);
                } else if (expired) {
                    this.saveSession(null);
                    callback('INITIAL_SESSION', null);
                } else {
                    this.scheduleRefresh(existing);
                    callback('INITIAL_SESSION', existing);
                }
            } else {
                callback('INITIAL_SESSION', null);
            }
        });
        return {
            data: {
                subscription: {
                    unsubscribe: () => {
                        this.listeners.delete(callback);
                    },
                },
            },
        };
    }

    async signInWithPassword({ email, password }: { email: string; password: string }) {
        try {
            const data = await postBackendAuth<AuthTokenPayload>('/auth/login', {
                email,
                password,
            });
            const session = this.buildSession(data.accessToken, data.refreshToken, email);
            sessionStorage.removeItem(RECOVERY_EMAIL_KEY);
            this.saveSession(session);
            this.scheduleRefresh(session);
            this.notify('SIGNED_IN', session);
            return { data: { session, user: session.user }, error: null };
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }

    async signOut(_options?: { scope?: string }) {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        sessionStorage.removeItem(RECOVERY_EMAIL_KEY);
        this.saveSession(null);
        this.notify('SIGNED_OUT', null);
        return { error: null };
    }

    async resetPasswordForEmail(email: string, _options?: { redirectTo?: string }) {
        try {
            await postBackendAuth<void>('/auth/forgot-password', { email });
            sessionStorage.setItem(RECOVERY_EMAIL_KEY, email);
            this.notify('PASSWORD_RECOVERY', {
                access_token: '',
                user: { id: email, email },
            });
            return { data: {}, error: null };
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }

    async updateUser({ password, code, email }: { password: string; code?: string; email?: string }) {
        try {
            const targetEmail = (email || sessionStorage.getItem(RECOVERY_EMAIL_KEY) || '').trim();
            if (!targetEmail) {
                throw new Error('Vui lòng nhập email để đặt lại mật khẩu.');
            }
            if (!code || !code.trim()) {
                throw new Error('Vui lòng nhập mã xác nhận (OTP) đã gửi về email.');
            }
            await postBackendAuth<void>('/auth/reset-password', {
                email: targetEmail,
                code: code.trim(),
                newPassword: password,
            });
            sessionStorage.removeItem(RECOVERY_EMAIL_KEY);
            return { data: {}, error: null };
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }
}

export const cognito = !useMock ? { auth: new BackendCognitoAuthService() } : null;

export function requireCognito() {
    if (!cognito) {
        throw new Error('Dịch vụ xác thực không khả dụng ở chế độ mock.');
    }
    return cognito;
}
