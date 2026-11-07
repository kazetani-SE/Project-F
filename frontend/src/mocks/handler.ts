import { delay, http, HttpResponse, passthrough } from 'msw';
import {
    MOCK_EVENTS,
    MOCK_ROLES,
    MOCK_USER,
    MOCK_DOCUMENTS,
    MOCK_MEDIA_ASSETS,
    MOCK_INCIDENTS,
    MOCK_FAQS,
    MOCK_FEEDBACKS,
    MOCK_FEEDBACK_SUMMARY,
} from './data';
import type { CreateDocumentRequest, DocumentApprovalRequest, DocumentResponse } from '../types/models/document';
import type {
    CreateMediaAssetRequest,
    MediaApprovalRequest,
    MediaAssetResponse,
    UpdatePrintStatusRequest,
} from '../types/models/media';
import type {
    CreateFaqRequest,
    CreateIncidentRequest,
    CreateFeedbackRequest,
    FaqResponse,
    IncidentResponse,
    FeedbackResponse,
} from '../types/models/knowledge';
import type { PresignedUploadRequest } from '../types/models/storage';

const BASE = '/api/v1';
const ok = <T,>(data: T) => HttpResponse.json({ success: true, data });

// Local in-memory states for mock mutation
let documentsState: DocumentResponse[] = [...MOCK_DOCUMENTS];
let mediaAssetsState: MediaAssetResponse[] = [...MOCK_MEDIA_ASSETS];
let incidentsState: IncidentResponse[] = [...MOCK_INCIDENTS];
let faqsState: FaqResponse[] = [...MOCK_FAQS];
let feedbacksState: FeedbackResponse[] = [...MOCK_FEEDBACKS];

export const handlers = [
    // --- Auth & Events ---
    http.get(`${BASE}/auth/me`, async () => {
        await delay(200);
        return ok(MOCK_USER);
    }),
    http.get(`${BASE}/events`, async () => {
        await delay(300);
        return ok(MOCK_EVENTS);
    }),
    http.get(`${BASE}/events/:eventId/my-role`, async ({ params }) => {
        await delay(600);
        return ok({ role: MOCK_ROLES[params.eventId as string] ?? null });
    }),

    // --- Storage Service ---
    http.post(`${BASE}/storage/presigned-upload`, async ({ request }) => {
        if (import.meta.env.VITE_MOCK_STORAGE === 'false') {
            return passthrough();
        }
        await delay(250);
        const body = (await request.json()) as PresignedUploadRequest;
        const sanitized =
            body.fileName
                .normalize('NFC')
                .replace(/[\u0000-\u001f/\\]+/g, '_')
                .trim() || 'unnamed-file';
        const objectKey = `${body.category.toLowerCase()}s/${sanitized}`;
        const s3Base = 'https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com';

        return ok({
            uploadUrl: `${s3Base}/${objectKey}?mock-presigned=true`,
            fileUrl: `${s3Base}/${objectKey}`,
            objectKey,
            expiresInMinutes: 10,
        });
    }),

    http.get(`${BASE}/storage/presigned-download`, async ({ request }) => {
        if (import.meta.env.VITE_MOCK_STORAGE === 'false') {
            return passthrough();
        }
        await delay(200);
        const url = new URL(request.url);
        const objectKey = url.searchParams.get('objectKey') || 'sample.pdf';
        const s3Base = 'https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com';

        return ok({
            downloadUrl: `${s3Base}/${objectKey}?mock-download=true`,
            objectKey,
            expiresInMinutes: 15,
        });
    }),

    // Mock direct S3 PUT binary upload
    http.put('https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com/*', async () => {
        if (import.meta.env.VITE_MOCK_STORAGE === 'false') {
            return passthrough();
        }
        await delay(600);
        return new HttpResponse(null, { status: 200 });
    }),

    // --- Documents ---
    http.get(`${BASE}/events/:eventId/documents`, async ({ params }) => {
        await delay(300);
        const eventId = params.eventId as string;
        const docs = documentsState.filter((d) => d.eventId === eventId);
        return ok(docs.length > 0 ? docs : documentsState);
    }),

    http.post(`${BASE}/events/:eventId/documents`, async ({ params, request }) => {
        await delay(400);
        const eventId = params.eventId as string;
        const body = (await request.json()) as CreateDocumentRequest;

        const newDoc: DocumentResponse = {
            id: `doc-${Date.now()}`,
            eventId,
            parentDocumentId: body.parentDocumentId ?? null,
            docType: body.docType,
            title: body.title,
            version: body.version || '1.0',
            fileUrl: body.fileUrl,
            uploadedBy: body.uploadedBy || 'Người dùng hiện tại',
            status: 'PENDING',
            approvedBy: null,
            approvedAt: null,
            rejectionReason: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        documentsState = [newDoc, ...documentsState];
        return ok(newDoc);
    }),

    http.patch(`${BASE}/events/:eventId/documents/:documentId/approval`, async ({ params, request }) => {
        await delay(300);
        const docId = params.documentId as string;
        const body = (await request.json()) as DocumentApprovalRequest;

        documentsState = documentsState.map((d) => {
            if (d.id === docId) {
                return {
                    ...d,
                    status: body.status,
                    approvedBy: body.approvedBy,
                    approvedAt: new Date().toISOString(),
                    rejectionReason: body.rejectionReason ?? null,
                    updatedAt: new Date().toISOString(),
                };
            }
            return d;
        });

        const updated = documentsState.find((d) => d.id === docId);
        return ok(updated);
    }),

    // --- Media Assets ---
    http.get(`${BASE}/events/:eventId/media-assets`, async ({ params, request }) => {
        await delay(300);
        const eventId = params.eventId as string;
        const url = new URL(request.url);
        const assetType = url.searchParams.get('assetType');

        let assets = mediaAssetsState.filter((m) => m.eventId === eventId);
        if (assets.length === 0) assets = mediaAssetsState;
        if (assetType) {
            assets = assets.filter((m) => m.assetType === assetType);
        }
        return ok(assets);
    }),

    http.post(`${BASE}/events/:eventId/media-assets`, async ({ params, request }) => {
        await delay(400);
        const eventId = params.eventId as string;
        const body = (await request.json()) as CreateMediaAssetRequest;

        const newAsset: MediaAssetResponse = {
            id: `med-${Date.now()}`,
            eventId,
            assetType: body.assetType,
            title: body.title,
            specifications: body.specifications ?? null,
            designFileUrl: body.designFileUrl ?? null,
            previewImageUrl: body.previewImageUrl ?? null,
            isPrinted: false,
            approvalStatus: 'PENDING',
            approvedBy: null,
            createdAt: new Date().toISOString(),
        };

        mediaAssetsState = [newAsset, ...mediaAssetsState];
        return ok(newAsset);
    }),

    http.patch(`${BASE}/events/:eventId/media-assets/:assetId/print-status`, async ({ params, request }) => {
        await delay(300);
        const assetId = params.assetId as string;
        const body = (await request.json()) as UpdatePrintStatusRequest;

        mediaAssetsState = mediaAssetsState.map((m) => {
            if (m.id === assetId) {
                return { ...m, isPrinted: body.isPrinted };
            }
            return m;
        });

        const updated = mediaAssetsState.find((m) => m.id === assetId);
        return ok(updated);
    }),

    http.patch(`${BASE}/events/:eventId/media-assets/:assetId/approval`, async ({ params, request }) => {
        await delay(300);
        const assetId = params.assetId as string;
        const body = (await request.json()) as MediaApprovalRequest;

        mediaAssetsState = mediaAssetsState.map((m) => {
            if (m.id === assetId) {
                return {
                    ...m,
                    approvalStatus: body.approvalStatus,
                    approvedBy: body.approvedBy,
                };
            }
            return m;
        });

        const updated = mediaAssetsState.find((m) => m.id === assetId);
        return ok(updated);
    }),

    // --- Incidents ---
    http.get(`${BASE}/events/:eventId/incidents`, async ({ params }) => {
        await delay(300);
        const eventId = params.eventId as string;
        const incidents = incidentsState.filter((i) => i.eventId === eventId);
        return ok(incidents.length > 0 ? incidents : incidentsState);
    }),

    http.post(`${BASE}/events/:eventId/incidents`, async ({ params, request }) => {
        await delay(400);
        const eventId = params.eventId as string;
        const body = (await request.json()) as CreateIncidentRequest;

        const newIncident: IncidentResponse = {
            id: `inc-${Date.now()}`,
            eventId,
            reportedBy: body.reportedBy || 'Người dùng hiện tại',
            title: body.title,
            severity: body.severity,
            departments: body.departments,
            description: body.description,
            rootCause: body.rootCause,
            immediateSolution: body.immediateSolution,
            lessonLearned: body.lessonLearned,
            createdAt: new Date().toISOString(),
        };

        incidentsState = [newIncident, ...incidentsState];
        return ok(newIncident);
    }),

    // --- FAQs ---
    http.get(`${BASE}/event-series/:seriesId/faqs`, async ({ request }) => {
        await delay(300);
        const url = new URL(request.url);
        const category = url.searchParams.get('category');

        let faqs = [...faqsState];
        if (category) {
            faqs = faqs.filter((f) => f.category === category);
        }
        return ok(faqs);
    }),

    http.post(`${BASE}/event-series/:seriesId/faqs`, async ({ params, request }) => {
        await delay(300);
        const seriesId = params.seriesId as string;
        const body = (await request.json()) as CreateFaqRequest;

        const newFaq: FaqResponse = {
            id: `faq-${Date.now()}`,
            seriesId,
            question: body.question,
            answer: body.answer,
            category: body.category,
            isPinned: body.isPinned ?? false,
            updatedAt: new Date().toISOString(),
        };

        faqsState = [newFaq, ...faqsState];
        return ok(newFaq);
    }),

    http.patch(`${BASE}/event-series/:seriesId/faqs/:faqId/pin`, async ({ params, request }) => {
        await delay(250);
        const faqId = params.faqId as string;
        const body = (await request.json()) as { isPinned: boolean };

        faqsState = faqsState.map((f) => {
            if (f.id === faqId) {
                return { ...f, isPinned: body.isPinned, updatedAt: new Date().toISOString() };
            }
            return f;
        });

        const updated = faqsState.find((f) => f.id === faqId);
        return ok(updated);
    }),

    // --- Feedbacks ---
    http.get(`${BASE}/events/:eventId/feedbacks`, async ({ params }) => {
        await delay(300);
        const eventId = params.eventId as string;
        const feedbacks = feedbacksState.filter((f) => f.eventId === eventId);
        return ok(feedbacks.length > 0 ? feedbacks : feedbacksState);
    }),

    http.get(`${BASE}/events/:eventId/feedbacks/summary`, async () => {
        await delay(300);
        return ok(MOCK_FEEDBACK_SUMMARY);
    }),

    http.post(`${BASE}/events/:eventId/feedbacks`, async ({ params, request }) => {
        await delay(400);
        const eventId = params.eventId as string;
        const body = (await request.json()) as CreateFeedbackRequest;

        const newFeedback: FeedbackResponse = {
            id: `fb-${Date.now()}`,
            eventId,
            sourceType: body.sourceType,
            fileUrl: body.fileUrl,
            ratingScore: body.ratingScore,
            highlightContent: body.highlightContent ?? null,
            improvementContent: body.improvementContent ?? null,
            customResponses: body.customResponses ?? {},
            submittedAt: new Date().toISOString(),
        };

        feedbacksState = [newFeedback, ...feedbacksState];
        return ok(newFeedback);
    }),

    http.post(`${BASE}/events/:eventId/feedbacks/batch`, async ({ params, request }) => {
        await delay(500);
        const eventId = params.eventId as string;
        const bodyList = (await request.json()) as CreateFeedbackRequest[];

        const createdList: FeedbackResponse[] = bodyList.map((body, idx) => ({
            id: `fb-${Date.now()}-${idx}`,
            eventId,
            sourceType: body.sourceType,
            fileUrl: body.fileUrl,
            ratingScore: body.ratingScore,
            highlightContent: body.highlightContent ?? null,
            improvementContent: body.improvementContent ?? null,
            customResponses: body.customResponses ?? {},
            submittedAt: new Date().toISOString(),
        }));

        feedbacksState = [...createdList, ...feedbacksState];
        return ok(createdList);
    }),
];
