import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Polyfill Promise.withResolvers cho các trình duyệt chưa hỗ trợ ECMAScript 2024
if (typeof (Promise as any).withResolvers === 'undefined') {
    (Promise as any).withResolvers = function <T>() {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: any) => void;
        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

async function enableMocking() {
    if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCK !== 'true') return;
    try {
        const { worker } = await import('./mocks/browser');
        await worker.start({
            quiet: true,
        });
    } catch (err) {
        console.warn('MSW Mocking failed to initialize:', err);
    }
}

// Luôn bảo đảm React được render vào DOM kể cả khi mock service worker gặp sự cố
enableMocking().finally(() => {
    const rootEl = document.getElementById('root');
    if (rootEl) {
        createRoot(rootEl).render(
            <StrictMode>
                <App />
            </StrictMode>,
        );
    }
});
