// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useResource } from '../../src/hooks/useResource';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((finish) => { resolve = finish; });
    return { promise, resolve };
}

function ResourceView({ load }: { load: () => Promise<string> }) {
    const resource = useResource(load);
    return <>
        <span>{resource.data ?? 'Đang tải'}</span>
        <button onClick={resource.reload}>Tải lại</button>
    </>;
}

it('uses one in-flight request when StrictMode replays an effect', async () => {
    const first = deferred<string>();
    const load = vi.fn(() => first.promise);

    render(<StrictMode><ResourceView load={load} /></StrictMode>);
    expect(load).toHaveBeenCalledTimes(1);

    first.resolve('Đã tải');
    expect(await screen.findByText('Đã tải')).toBeTruthy();
});

it('starts a fresh request for Reload while the previous one is pending', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    render(<StrictMode><ResourceView load={load} /></StrictMode>);
    expect(load).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(load).toHaveBeenCalledTimes(2);

    second.resolve('Dữ liệu mới');
    expect(await screen.findByText('Dữ liệu mới')).toBeTruthy();
    first.resolve('Dữ liệu cũ');
    expect(screen.getByText('Dữ liệu mới')).toBeTruthy();
});
