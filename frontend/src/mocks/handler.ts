import { delay, http, HttpResponse, passthrough } from 'msw';
import { managementHandlers } from './management';
import {
    MOCK_DOCUMENTS,
    MOCK_MEDIA_ASSETS,
    MOCK_INCIDENTS,
    MOCK_FAQS,
    MOCK_FEEDBACKS,
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
    FeedbackAiReportResponse,
    GenerateFaqSuggestionsRequest,
    DraftIncidentAiRequest,
    KnowledgeChatRequest,
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
const aiFeedbackReportsState: Record<string, FeedbackAiReportResponse> = {};

export const handlers = [
    ...managementHandlers,

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

    http.delete(`${BASE}/storage/file`, async () => {
        await delay(200);
        return ok(null);
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

    http.delete(`${BASE}/events/:eventId/documents/:documentId`, async ({ params }) => {
        await delay(250);
        const docId = params.documentId as string;
        documentsState = documentsState.filter((d) => d.id !== docId);
        return ok(null);
    }),

    http.delete(`${BASE}/documents/:documentId`, async ({ params }) => {
        await delay(250);
        const docId = params.documentId as string;
        documentsState = documentsState.filter((d) => d.id !== docId);
        return ok(null);
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
            approvalStatus: body.approvalStatus || 'PENDING',
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

    http.delete(`${BASE}/events/:eventId/media-assets/:assetId`, async ({ params }) => {
        await delay(250);
        const assetId = params.assetId as string;
        mediaAssetsState = mediaAssetsState.filter((m) => m.id !== assetId);
        return ok(null);
    }),

    http.delete(`${BASE}/media-assets/:assetId`, async ({ params }) => {
        await delay(250);
        const assetId = params.assetId as string;
        mediaAssetsState = mediaAssetsState.filter((m) => m.id !== assetId);
        return ok(null);
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

    http.put(`${BASE}/events/:eventId/media-assets/:assetId`, async ({ params, request }) => {
        await delay(300);
        const assetId = params.assetId as string;
        const body = (await request.json()) as CreateMediaAssetRequest;

        mediaAssetsState = mediaAssetsState.map((m) => {
            if (m.id === assetId) {
                return {
                    ...m,
                    assetType: body.assetType,
                    title: body.title,
                    specifications: body.specifications ?? m.specifications,
                    designFileUrl: body.designFileUrl ?? m.designFileUrl,
                    previewImageUrl: body.previewImageUrl ?? m.previewImageUrl,
                };
            }
            return m;
        });

        const updated = mediaAssetsState.find((m) => m.id === assetId);
        return ok(updated);
    }),

    http.put(`${BASE}/media-assets/:assetId`, async ({ params, request }) => {
        await delay(300);
        const assetId = params.assetId as string;
        const body = (await request.json()) as CreateMediaAssetRequest;

        mediaAssetsState = mediaAssetsState.map((m) => {
            if (m.id === assetId) {
                return {
                    ...m,
                    assetType: body.assetType,
                    title: body.title,
                    specifications: body.specifications ?? m.specifications,
                    designFileUrl: body.designFileUrl ?? m.designFileUrl,
                    previewImageUrl: body.previewImageUrl ?? m.previewImageUrl,
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

    http.post(`${BASE}/event-series/:seriesId/faqs/batch`, async ({ params, request }) => {
        await delay(400);
        const seriesId = params.seriesId as string;
        const body = (await request.json()) as CreateFaqRequest[];

        const createdFaqs: FaqResponse[] = body.map((item, index) => ({
            id: `faq-${Date.now()}-${index}`,
            seriesId,
            question: item.question,
            answer: item.answer,
            category: item.category,
            isPinned: item.isPinned ?? false,
            updatedAt: new Date().toISOString(),
        }));

        faqsState = [...createdFaqs, ...faqsState];
        return ok(createdFaqs);
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

    http.get(`${BASE}/events/:eventId/feedbacks/summary`, async ({ params }) => {
        await delay(250);
        const eventId = params.eventId as string;
        const eventFeedbacks = feedbacksState.filter((f) => f.eventId === eventId);
        const list = eventFeedbacks.length > 0 ? eventFeedbacks : feedbacksState;
        const total = list.length;
        const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let sum = 0;
        for (const fb of list) {
            const score = Math.min(5, Math.max(1, Math.round(fb.ratingScore)));
            ratingBreakdown[score] = (ratingBreakdown[score] || 0) + 1;
            sum += score;
        }
        const averageRating = total > 0 ? Number((sum / total).toFixed(2)) : 0;
        return ok({
            totalFeedbacks: total,
            averageRating,
            ratingBreakdown,
        });
    }),

    http.delete(`${BASE}/events/:eventId/feedbacks/:feedbackId`, async ({ params }) => {
        await delay(200);
        const feedbackId = params.feedbackId as string;
        feedbacksState = feedbacksState.filter((f) => f.id !== feedbackId);
        return ok(null);
    }),

    http.delete(`${BASE}/feedbacks/:feedbackId`, async ({ params }) => {
        await delay(200);
        const feedbackId = params.feedbackId as string;
        feedbacksState = feedbacksState.filter((f) => f.id !== feedbackId);
        return ok(null);
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

    // --- Knowledge AI Agent & Chatbot ---
    http.get(`${BASE}/events/:eventId/feedbacks/ai-report`, async ({ params }) => {
        await delay(250);
        const eventId = params.eventId as string;
        const saved = aiFeedbackReportsState[eventId];
        if (!saved) {
            return ok(null);
        }
        const evFeedbacks = feedbacksState.filter((f) => f.eventId === eventId);
        const currentList = evFeedbacks.length > 0 ? evFeedbacks : feedbacksState;
        const currentCount = currentList.length;
        const delta = Math.max(0, currentCount - saved.feedbackCountSnapshot);
        const isStale = currentCount !== saved.feedbackCountSnapshot;

        return ok({
            ...saved,
            currentFeedbackCount: currentCount,
            newFeedbackCountDelta: delta,
            isStale,
        });
    }),

    http.post(`${BASE}/events/:eventId/feedbacks/ai-report`, async ({ params }) => {
        await delay(700);
        const eventId = params.eventId as string;
        const evFeedbacks = feedbacksState.filter((f) => f.eventId === eventId);
        const currentList = evFeedbacks.length > 0 ? evFeedbacks : feedbacksState;
        const count = currentList.length;
        const avg =
            count > 0
                ? Number(
                      (
                          currentList.reduce((acc, f) => acc + f.ratingScore, 0) / count
                      ).toFixed(2),
                  )
                : 0;
        const posCount = currentList.filter((f) => f.ratingScore >= 4).length;
        const neuCount = currentList.filter((f) => f.ratingScore === 3).length;
        const posPct = count > 0 ? Math.round((posCount * 100) / count) : 0;
        const neuPct = count > 0 ? Math.round((neuCount * 100) / count) : 0;
        const negPct = Math.max(0, 100 - posPct - neuPct);

        const isDeep = count >= 25;
        const nowIso = new Date().toISOString();

        const report: FeedbackAiReportResponse = {
            id: `ai-rep-${Date.now()}`,
            eventId,
            modelUsed: isDeep
                ? 'anthropic.claude-3-5-sonnet-20240620-v1:0'
                : 'anthropic.claude-3-haiku-20240307-v1:0',
            modelTier: isDeep ? 'DEEP' : 'FAST',
            routingReason: isDeep
                ? `Deep Tier — Phân tích chuyên sâu trên tập dữ liệu khảo sát lớn (${count} phiếu)`
                : `Fast Tier — Tối ưu chi phí AWS Bedrock cho tập dữ liệu gọn (${count} phiếu)`,
            feedbackCountSnapshot: count,
            currentFeedbackCount: count,
            newFeedbackCountDelta: 0,
            isStale: false,
            averageRatingSnapshot: avg,
            executiveSummary: `Báo cáo tổng hợp trên ${count} phiếu khảo sát đạt điểm trung bình ${avg}/5.0★ (${posPct}% tích cực, ${negPct}% cần khắc phục). Người tham gia đánh giá rất cao nội dung chuyên môn thực chiến của diễn giả và sự hỗ trợ nhiệt tình từ đội ngũ BTC, nhưng phản ánh tình trạng chờ đợi lâu ở khâu check-in giờ cao điểm và âm thanh hội trường đôi lúc bị vọng.`,
            sentimentBreakdown: {
                positive: posPct,
                neutral: neuPct,
                negative: negPct,
            },
            topHighlights: [
                'Nội dung chia sẻ từ diễn giả thực tế, có chiều sâu và sát nhu cầu sinh viên.',
                'Đội ngũ tình nguyện viên & BTC hướng dẫn nhiệt tình, chu đáo tại hội trường.',
                'Không khí phiên hỏi đáp (Q&A) sôi nổi, tài liệu demo dễ hiểu.',
            ],
            topImprovements: [
                'Khu vực bàn đón tiếp (check-in) bị ùn tắc trong 20 phút đầu giờ.',
                'Âm thanh micro không dây ở cuối hội trường đôi lúc bị rè và khó nghe.',
                'Cần gửi thông báo sơ đồ phòng và tài liệu chuẩn bị sớm hơn trước ngày diễn ra.',
            ],
            departmentActions: [
                {
                    department: 'PLAN',
                    action: 'Mở rộng bàn đón tiếp thành 3 luồng độc lập và chuẩn bị kịch bản điều phối giờ cao điểm.',
                },
                {
                    department: 'MEDIA',
                    action: 'Tổng duyệt kỹ thuật âm thanh (Soundcheck) trước 60 phút và gửi email Remind kèm sơ đồ hội trường trước 48h.',
                },
                {
                    department: 'HR',
                    action: 'Bố trí thêm 4 tình nguyện viên phân luồng từ sảnh thang máy lên hội trường chính.',
                },
                {
                    department: 'ACADEMIC',
                    action: 'Tăng thời lượng phiên Q&A thêm 15 phút và đóng gói bộ câu hỏi gửi trước cho diễn giả.',
                },
            ],
            suggestedIncidents: [
                {
                    title: 'Ùn tắc bàn đón tiếp check-in giờ cao điểm & âm thanh micro vọng ở cuối phòng',
                    severity: 'MEDIUM',
                    departments: ['PLAN', 'MEDIA', 'HR'],
                    description:
                        'Nhiều phiếu khảo sát của người tham dự phản ánh phải xếp hàng chờ check-in hơn 15 phút và âm thanh ở các hàng ghế cuối bị vọng.',
                    rootCause:
                        'Chỉ bố trí 1 bàn đón tiếp duy nhất khi lượng người đổ về cùng lúc và chưa kiểm tra độ phủ loa ở cuối khán phòng.',
                    immediateSolution:
                        'Huy động nhân sự dự phòng mở thêm luồng xác nhận nhanh và điều chỉnh lại gain trên bàn mixer.',
                    lessonLearned:
                        'Luôn tách tối thiểu 2-3 luồng đón tiếp theo chữ cái tên và test âm thanh ở cả 4 góc hội trường trong buổi Rehearsal.',
                },
            ],
            generatedAt: nowIso,
            updatedAt: nowIso,
        };

        aiFeedbackReportsState[eventId] = report;
        return ok(report);
    }),

    http.post(`${BASE}/event-series/:seriesId/faqs/ai-suggest`, async ({ request }) => {
        await delay(500);
        const body = (await request.json().catch(() => ({}))) as GenerateFaqSuggestionsRequest;
        const topic = body.focusTopic?.trim();

        const baseSuggestions = [
            {
                question:
                    'Sinh viên năm nhất chưa có kiến thức nền tảng chuyên sâu có thể đăng ký tham gia sự kiện được không?',
                category: 'Thể lệ & Tham dự',
                rationale:
                    'Câu hỏi xuất hiện nhiều nhất từ nhóm tân sinh viên mỗi khi mở đơn đăng ký mùa mới.',
                answerHint:
                    'Gợi ý: Nêu rõ sự kiện chào đón mọi khóa, có phiên hướng dẫn nhập môn và hỗ trợ ghép nhóm.',
            },
            {
                question:
                    'Nếu trùng lịch thi hoặc lịch học đột xuất thì có được đổi ca tham dự hoặc bảo lưu suất đăng ký không?',
                category: 'Thể lệ & Tham dự',
                rationale:
                    'Giúp BTC chủ động nắm số lượng vắng mặt (no-show) để điều chỉnh số suất hậu cần/teabreak.',
                answerHint:
                    'Gợi ý: Quy định thời hạn báo hủy/đổi thông tin tối thiểu 24h trước giờ khai mạc qua form/fanpage.',
            },
            {
                question:
                    'Người tham dự cần mang theo những vật dụng gì khi check-in và BTC có hỗ trợ ổ cắm điện/wifi không?',
                category: 'Hậu cần & Đón tiếp',
                rationale:
                    'Dựa trên phản hồi từ các mùa trước về việc thiếu ổ cắm điện và lúng túng tại bàn đón tiếp.',
                answerHint:
                    'Gợi ý: Nhắc mang thẻ sinh viên, laptop sạc đầy pin (nếu có thực hành) và thông tin khu vực teabreak.',
            },
            {
                question:
                    'Điều kiện để nhận Giấy chứng nhận (Certificate) và cộng điểm rèn luyện sau sự kiện là gì?',
                category: 'Quyền lợi & Sau sự kiện',
                rationale:
                    'Giảm 70% lượng tin nhắn hỏi thăm fanpage sau khi sự kiện kết thúc.',
                answerHint:
                    'Gợi ý: Yêu cầu điểm danh đủ các phiên + hoàn thành form Feedback cuối chương trình; trả kết quả sau 5-7 ngày.',
            },
            {
                question:
                    'Thành viên BTC khi mua vật tư hậu cần cần lưu ý những chứng từ gì để được duyệt hoàn ứng nhanh?',
                category: 'Tài chính & Nội bộ BTC',
                rationale:
                    'Đảm bảo tuân thủ quy tắc bắt buộc đính kèm hóa đơn chứng từ hợp lệ của phân hệ Tài chính.',
                answerHint:
                    'Gợi ý: Bắt buộc chụp ảnh/PDF hóa đơn rõ nét (<= 15MB) gắn đúng hạng mục dự trù đã duyệt.',
            },
        ];

        if (topic) {
            baseSuggestions.unshift({
                question: `Những quy định và lưu ý quan trọng nhất về "${topic}" trong mùa sự kiện năm nay là gì?`,
                category: topic,
                rationale: `Được AI sinh trực tiếp theo chủ đề trọng tâm "${topic}" do người quản trị yêu cầu.`,
                answerHint: `Gợi ý: Điền quy định cụ thể, mốc thời gian áp dụng và đầu mối liên hệ cho mục ${topic}.`,
            });
        }

        return ok({
            modelUsed: 'anthropic.claude-3-haiku-20240307-v1:0',
            modelTier: 'FAST',
            routingReason:
                'Fast Tier — Sinh bộ câu hỏi FAQ dự kiến tốc độ cao & tiết kiệm 90% chi phí token',
            suggestions: baseSuggestions.slice(0, body.count || 5),
        });
    }),

    http.post(`${BASE}/events/:eventId/incidents/ai-draft`, async ({ request }) => {
        await delay(500);
        const body = (await request.json()) as DraftIncidentAiRequest;
        const raw = body.briefObservation.trim();
        const lower = raw.toLowerCase();

        const isDeep = raw.length >= 450;
        const severity =
            lower.includes('mất điện') || lower.includes('sập') || lower.includes('nghiêm trọng')
                ? 'CRITICAL'
                : lower.includes('trễ') || lower.includes('thiếu') || lower.includes('hỏng') || lower.includes('hú')
                  ? 'HIGH'
                  : 'MEDIUM';

        const depts: ('HR' | 'PLAN' | 'MEDIA' | 'ACADEMIC')[] = [];
        if (lower.includes('âm thanh') || lower.includes('mic') || lower.includes('led') || lower.includes('slide')) {
            depts.push('MEDIA');
        }
        if (lower.includes('nhân sự') || lower.includes('ctv') || lower.includes('tình nguyện')) {
            depts.push('HR');
        }
        if (lower.includes('diễn giả') || lower.includes('đề') || lower.includes('chuyên môn')) {
            depts.push('ACADEMIC');
        }
        if (depts.length === 0 || lower.includes('hậu cần') || lower.includes('ăn') || lower.includes('check-in')) {
            depts.push('PLAN');
        }

        return ok({
            title: raw.length > 72 ? `${raw.slice(0, 70)}...` : raw,
            severity,
            departments: depts,
            description: `Sự cố ghi nhận trong quá trình vận hành sự kiện: ${raw}`,
            rootCause:
                'Khâu rà soát chéo (cross-check) trước giờ G chưa có phương án dự phòng (backup plan) đầy đủ và thiếu cảnh báo sớm khi tải tăng đột biến.',
            immediateSolution:
                'Điều động nhân sự trực chiến xử lý tại chỗ, kích hoạt phương án thay thế tạm thời và thông báo kịp thời để ổn định chương trình.',
            lessonLearned:
                'Đưa hạng mục này vào Checklist tổng duyệt bắt buộc 24h trước sự kiện cho các mùa sau; luôn dự phòng tối thiểu 15% thiết bị/vật tư.',
            modelUsed: isDeep
                ? 'anthropic.claude-3-5-sonnet-20240620-v1:0'
                : 'anthropic.claude-3-haiku-20240307-v1:0',
            modelTier: isDeep ? 'DEEP' : 'FAST',
            routingReason: isDeep
                ? 'Deep Tier — Mô tả sự cố phức tạp, cần phân tích nguyên nhân sâu 5-Whys'
                : 'Fast Tier — Phân tích nhanh Post-Mortem 4 mục cho sự cố đơn lẻ',
        });
    }),

    http.post(`${BASE}/events/:eventId/knowledge/ai-chat`, async ({ request }) => {
        await delay(550);
        const body = (await request.json()) as KnowledgeChatRequest;
        const msg = body.message.trim().toLowerCase();
        const isComplex =
            msg.length >= 160 ||
            ['tại sao', 'nguyên nhân', 'so sánh', 'chiến lược', 'phân tích', 'tổng hợp', 'rủi ro'].some((kw) =>
                msg.includes(kw),
            );

        return ok({
            answer: `Dựa trên **Kho Tri Thức Đa Mùa** (gồm ${faqsState.length} FAQ, ${incidentsState.length} sự cố Post-Mortem và ${feedbacksState.length} phiếu khảo sát), đây là thông tin dành cho câu hỏi của bạn:\n\n- **Về quy định & FAQ**: Các câu hỏi được ghim ưu tiên nhấn mạnh việc chuẩn bị kỹ thẻ sinh viên/laptop khi check-in và quy trình hoàn ứng cần chứng từ hợp lệ (<= 15MB).\n- **Về bài học kinh nghiệm (Post-Mortem)**: Cần đặc biệt lưu ý kiểm tra kỹ hệ thống âm thanh/micro trước 60 phút và phân luồng bàn đón tiếp để tránh ùn tắc đầu giờ.\n- **Về đánh giá người tham dự (Feedback)**: Điểm sáng lớn nhất là chất lượng chuyên môn của diễn giả và sự nhiệt tình của BTC.`,
            modelUsed: isComplex
                ? 'anthropic.claude-3-5-sonnet-20240620-v1:0'
                : 'anthropic.claude-3-haiku-20240307-v1:0',
            modelTier: isComplex ? 'DEEP' : 'FAST',
            routingReason: isComplex
                ? 'Deep Tier — Câu hỏi yêu cầu suy luận, phân tích nguyên nhân hoặc tổng hợp đa nguồn'
                : 'Fast Tier — Câu hỏi tra cứu thông tin trực tiếp, tối ưu tốc độ & chi phí AWS Bedrock',
            citations: [
                {
                    sourceType: 'INCIDENT',
                    title: incidentsState[0]?.title || 'Nhật ký sự cố Post-Mortem',
                    snippet: incidentsState[0]?.lessonLearned || 'Luôn chuẩn bị phương án dự phòng trước giờ G.',
                },
                {
                    sourceType: 'FAQ',
                    title: faqsState[0]?.question || 'Kho FAQ chuỗi sự kiện',
                    snippet: faqsState[0]?.answer || 'Quy định chung dành cho người tham dự và thành viên BTC.',
                },
            ],
            followUpQuestions: [
                'Phân tích nguyên nhân các sự cố nghiêm trọng nhất và cách phòng tránh?',
                'Người tham dự góp ý cần cải thiện điểm gì nhiều nhất trong Feedback?',
                'Tóm tắt quy trình hoàn ứng tài chính và các câu hỏi FAQ ghim ưu tiên?',
            ],
        });
    }),
];
