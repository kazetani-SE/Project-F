import type { PageResponse } from '../types/common/api';

export async function loadPages<T>(list: (query: { page: number; size: number }) => Promise<PageResponse<T>>) {
    const items: T[] = [];
    let page = 0;
    let hasNext: boolean;
    do {
        const response = await list({ page, size: 100 });
        items.push(...response.items);
        hasNext = response.hasNext;
        page += 1;
    } while (hasNext);
    return items;
}
