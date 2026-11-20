import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/services/apiClient.ts';
import { getFeedbacksByEvent, getIncidentsByEvent } from '../src/services/knowledgeService.ts';
import { getDocumentsByEvent } from '../src/services/documentService.ts';
import { getMediaAssetsByEvent } from '../src/services/mediaService.ts';
import { eventService } from '../src/services/eventService.ts';

test('Knowledge deduplication: concurrent calls to getFeedbacksByEvent share a single HTTP request', async () => {
    let callCount = 0;
    const originalGet = apiClient.get;

    // Mock apiClient.get with simulated network latency
    apiClient.get = (async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
            data: {
                data: [{ id: 'fb-1', eventId: 'test-event-1' }],
            },
        };
    }) as typeof apiClient.get;

    try {
        // Fire 3 simultaneous requests (simulating parent KnowledgePage, child FeedbackSection, and StrictMode)
        const [res1, res2, res3] = await Promise.all([
            getFeedbacksByEvent('test-event-1'),
            getFeedbacksByEvent('test-event-1'),
            getFeedbacksByEvent('test-event-1'),
        ]);

        assert.equal(callCount, 1, 'apiClient.get should only be called once despite 3 concurrent invocations');
        assert.deepEqual(res1, res2);
        assert.deepEqual(res2, res3);
    } finally {
        apiClient.get = originalGet;
    }
});

test('Knowledge deduplication: concurrent calls to getIncidentsByEvent share a single HTTP request', async () => {
    let callCount = 0;
    const originalGet = apiClient.get;

    apiClient.get = (async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
            data: {
                data: [{ id: 'inc-1', eventId: 'test-event-2' }],
            },
        };
    }) as typeof apiClient.get;

    try {
        const [res1, res2] = await Promise.all([
            getIncidentsByEvent('test-event-2'),
            getIncidentsByEvent('test-event-2'),
        ]);

        assert.equal(callCount, 1, 'apiClient.get should only be called once for concurrent incidents');
        assert.deepEqual(res1, res2);
    } finally {
        apiClient.get = originalGet;
    }
});

test('Documents deduplication: concurrent calls to getDocumentsByEvent share a single HTTP request', async () => {
    let callCount = 0;
    const originalGet = apiClient.get;

    apiClient.get = (async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
            data: {
                data: [{ id: 'doc-1', eventId: 'test-event-3' }],
            },
        };
    }) as typeof apiClient.get;

    try {
        const [res1, res2, res3] = await Promise.all([
            getDocumentsByEvent('test-event-3'),
            getDocumentsByEvent('test-event-3'),
            getDocumentsByEvent('test-event-3'),
        ]);

        assert.equal(callCount, 1, 'apiClient.get should only be called once for concurrent documents');
        assert.deepEqual(res1, res2);
        assert.deepEqual(res2, res3);
    } finally {
        apiClient.get = originalGet;
    }
});

test('Media assets deduplication: concurrent calls to getMediaAssetsByEvent share a single HTTP request', async () => {
    let callCount = 0;
    const originalGet = apiClient.get;

    apiClient.get = (async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
            data: {
                data: [{ id: 'media-1', eventId: 'test-event-4' }],
            },
        };
    }) as typeof apiClient.get;

    try {
        const [res1, res2, res3] = await Promise.all([
            getMediaAssetsByEvent('test-event-4'),
            getMediaAssetsByEvent('test-event-4'),
            getMediaAssetsByEvent('test-event-4'),
        ]);

        assert.equal(callCount, 1, 'apiClient.get should only be called once for concurrent media assets');
        assert.deepEqual(res1, res2);
        assert.deepEqual(res2, res3);
    } finally {
        apiClient.get = originalGet;
    }
});

test('Event organizers deduplication: concurrent calls to eventService.organizers share a single HTTP request', async () => {
    let callCount = 0;
    const originalGet = apiClient.get;

    apiClient.get = (async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
            data: {
                data: [{ id: 'org-1', eventId: 'test-event-5', memberId: 'mem-1', memberName: 'Nguyễn Văn An', role: 'LEAD_HEADER' }],
            },
        };
    }) as typeof apiClient.get;

    try {
        const [res1, res2, res3] = await Promise.all([
            eventService.organizers('test-event-5'),
            eventService.organizers('test-event-5'),
            eventService.organizers('test-event-5'),
        ]);

        assert.equal(callCount, 1, 'apiClient.get should only be called once for concurrent organizers requests');
        assert.deepEqual(res1, res2);
        assert.deepEqual(res2, res3);
    } finally {
        apiClient.get = originalGet;
    }
});
