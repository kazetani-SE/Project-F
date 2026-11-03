import type { AuthUser } from '../types/models/auth.ts';
import type { EventRole, EventSummary } from '../types/models/event.ts';
import type { DocumentResponse } from '../types/models/document.ts';
import type { MediaAssetResponse } from '../types/models/media.ts';
import type {
    IncidentResponse,
    FaqResponse,
    FeedbackResponse,
    FeedbackSummaryResponse,
} from '../types/models/knowledge.ts';

export const MOCK_USER: AuthUser = {
    id: 'u-0001',
    fullName: 'Nguyễn Văn An',
    email: 'an.nguyen@fcode.local',
    clubRole: 'PRESIDENT',
};

export const MOCK_EVENTS: EventSummary[] = [
    { id: 'ev-tech-fall-2026', name: 'Tech-Camp', seasonLabel: 'Season Fall 2026', status: 'IN_PROGRESS' },
    { id: 'ev-codewars-2026', name: 'Code Wars', seasonLabel: 'Season 2026', status: 'PLANNING' },
    { id: 'ev-git-101', name: 'Workshop Git & GitHub 101', seasonLabel: null, status: 'COMPLETED' },
    { id: 'ev-hackathon-2025', name: 'Hackathon', seasonLabel: 'Season 2025', status: 'CANCELLED' },
];

// Muốn test vai trò nào thì sửa ở đây. null = "Không thuộc BTC"
export const MOCK_ROLES: Record<string, EventRole | null> = {
    'ev-tech-fall-2026': 'HEAD_ORGANIZER',
    'ev-codewars-2026': 'LEAD_FINANCE',
    'ev-git-101': null,
    'ev-hackathon-2025': 'MEMBER',
};

// --- Mock Documents ---
export const MOCK_DOCUMENTS: DocumentResponse[] = [
    {
        id: 'doc-001',
        eventId: 'ev-tech-fall-2026',
        parentDocumentId: null,
        docType: 'MASTER_PLAN',
        title: 'Đề án tổ chức Tech-Camp Mùa Thu 2026',
        version: '1.0',
        fileUrl: 'https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com/documents/doc-001-masterplan-v1.pdf',
        uploadedBy: 'Nguyễn Văn An',
        status: 'APPROVED',
        approvedBy: 'Trần Ban Chủ Nhiệm',
        approvedAt: '2026-09-01T10:00:00Z',
        rejectionReason: null,
        createdAt: '2026-08-25T08:30:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
    },
    {
        id: 'doc-002',
        eventId: 'ev-tech-fall-2026',
        parentDocumentId: 'doc-001',
        docType: 'MASTER_PLAN',
        title: 'Đề án tổ chức Tech-Camp Mùa Thu 2026 (Điều chỉnh địa điểm)',
        version: '1.1',
        fileUrl: 'https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com/documents/doc-002-masterplan-v1.1.pdf',
        uploadedBy: 'Lê Minh Kế Hoạch',
        status: 'PENDING',
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        createdAt: '2026-09-10T14:15:00Z',
        updatedAt: '2026-09-10T14:15:00Z',
    },
    {
        id: 'doc-003',
        eventId: 'ev-tech-fall-2026',
        parentDocumentId: null,
        docType: 'RUNNING_ORDER',
        title: 'Kịch bản chi tiết Ngày 1 - Khai mạc & Team Building',
        version: '1.0',
        fileUrl: 'https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com/documents/doc-003-running-order.pdf',
        uploadedBy: 'Phạm Thị Điều Phối',
        status: 'APPROVED',
        approvedBy: 'Nguyễn Văn An',
        approvedAt: '2026-09-12T09:00:00Z',
        rejectionReason: null,
        createdAt: '2026-09-11T16:00:00Z',
        updatedAt: '2026-09-12T09:00:00Z',
    },
    {
        id: 'doc-004',
        eventId: 'ev-tech-fall-2026',
        parentDocumentId: null,
        docType: 'SPONSOR_PROPOSAL',
        title: 'Hồ sơ mời tài trợ doanh nghiệp công nghệ',
        version: '1.0',
        fileUrl: 'https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com/documents/doc-004-sponsor.pdf',
        uploadedBy: 'Đỗ Đối Ngoại',
        status: 'REJECTED',
        approvedBy: 'Nguyễn Văn An',
        approvedAt: '2026-09-05T11:20:00Z',
        rejectionReason: 'Quyền lợi nhà tài trợ Kim Cương chưa rõ ràng về gian hàng trải nghiệm',
        createdAt: '2026-09-04T10:00:00Z',
        updatedAt: '2026-09-05T11:20:00Z',
    },
];

// --- Mock Media Assets ---
export const MOCK_MEDIA_ASSETS: MediaAssetResponse[] = [
    {
        id: 'med-001',
        eventId: 'ev-tech-fall-2026',
        assetType: 'POSTER',
        title: 'Poster chính thức công bố sự kiện Tech-Camp',
        specifications: 'Khổ A1 (594 x 841 mm), Decal cán mờ 150gsm',
        designFileUrl: 'https://www.figma.com/file/sample-poster-techcamp',
        previewImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
        isPrinted: true,
        approvalStatus: 'APPROVED',
        approvedBy: 'Nguyễn Văn An',
        createdAt: '2026-09-02T15:30:00Z',
    },
    {
        id: 'med-002',
        eventId: 'ev-tech-fall-2026',
        assetType: 'BACKDROP',
        title: 'Phông nền sân khấu Hội trường Alpha',
        specifications: 'Hiflex bạt xám chống xuyên sáng 6m x 3.5m',
        designFileUrl: 'https://drive.google.com/sample-backdrop',
        previewImageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
        isPrinted: false,
        approvalStatus: 'APPROVED',
        approvedBy: 'Nguyễn Văn An',
        createdAt: '2026-09-05T11:00:00Z',
    },
    {
        id: 'med-003',
        eventId: 'ev-tech-fall-2026',
        assetType: 'STANDEE',
        title: 'Standee chỉ dẫn lối vào & Check-in QR',
        specifications: 'Kích thước 0.8m x 1.8m (Cuộn nhôm tiêu chuẩn)',
        designFileUrl: null,
        previewImageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop&q=80',
        isPrinted: false,
        approvalStatus: 'PENDING',
        approvedBy: null,
        createdAt: '2026-09-08T09:40:00Z',
    },
];

// --- Mock Incidents ---
export const MOCK_INCIDENTS: IncidentResponse[] = [
    {
        id: 'inc-001',
        eventId: 'ev-tech-fall-2026',
        reportedBy: 'Nguyễn Kỹ Thuật',
        title: 'Mất kết nối mạng Wi-Fi khu vực thi đấu Hackathon',
        severity: 'CRITICAL',
        departments: ['TECH', 'LOGISTICS'],
        description: 'Đường truyền cáp quang chính của phòng máy bị nghẽn do quá tải cấp phát IP DHCP lúc 14:00.',
        rootCause: 'Router phòng máy chỉ cấp dải subnet /24 (tối đa 250 thiết bị) trong khi có 380 thiết bị cùng kết nối.',
        immediateSolution: 'Kích hoạt ngay 4 cục phát Wi-Fi 4G công nghiệp dự phòng của CLB và mở rộng dải subnet router lên /22.',
        lessonLearned: 'Các mùa sau phải phối hợp trước với phòng IT trường cấp riêng VLAN với pool IP tối thiểu 600 thiết bị.',
        createdAt: '2026-09-14T14:30:00Z',
    },
    {
        id: 'inc-002',
        eventId: 'ev-tech-fall-2026',
        reportedBy: 'Phạm Hậu Cần',
        title: 'Thiếu 30 suất ăn trưa cho tình nguyện viên hỗ trợ',
        severity: 'MEDIUM',
        departments: ['LOGISTICS', 'HR'],
        description: 'Số lượng TNV phát sinh tăng thêm 25 bạn so với danh sách chốt ban đầu dẫn đến thiếu cơm trưa.',
        rootCause: 'Ban Nhân sự bổ sung nhân lực giờ chót nhưng chưa cập nhật vào bảng dự trù thực chi của Ban Hậu cần.',
        immediateSolution: 'Đặt bổ sung gấp 35 suất bánh mì kẹp và sữa tươi từ cửa hàng tiện lợi cách trường 200m trong vòng 20 phút.',
        lessonLearned: 'Mọi thay đổi quân số phải chốt trước 24 giờ và đối soát bằng văn bản giữa Lead HR và Lead Logistics.',
        createdAt: '2026-09-15T12:10:00Z',
    },
];

// --- Mock FAQs ---
export const MOCK_FAQS: FaqResponse[] = [
    {
        id: 'faq-001',
        seriesId: 'series-tech-camp',
        question: 'Sinh viên năm nhất chưa có kinh nghiệm lập trình có tham gia Tech-Camp được không?',
        answer: 'Hoàn toàn được! Tech-Camp được thiết kế phân tầng theo các bảng: Bảng Nhập môn (Dành cho K19/K20 làm quen logic & Git) và Bảng Chuyên sâu. Ban tổ chức có đội ngũ Mentor hỗ trợ 1-1 suốt sự kiện.',
        category: 'Thể lệ & Tham dự',
        isPinned: true,
        updatedAt: '2026-08-20T10:00:00Z',
    },
    {
        id: 'faq-002',
        seriesId: 'series-tech-camp',
        question: 'Quy trình hoàn ứng và thanh toán hóa đơn chi phí tổ chức như thế nào?',
        answer: 'Tất cả hóa đơn/chứng từ phải là hóa đơn hợp lệ (ảnh chụp rõ nét hoặc file PDF) được tải lên qua hệ thống S3. Lead Finance sẽ đối soát và phê duyệt trong vòng 48 giờ làm việc.',
        category: 'Tài chính & Hoàn ứng',
        isPinned: true,
        updatedAt: '2026-08-22T14:00:00Z',
    },
    {
        id: 'faq-003',
        seriesId: 'series-tech-camp',
        question: 'Quy cách thiết kế poster và backdrop chuẩn của CLB là gì?',
        answer: 'Mọi ấn phẩm truyền thông phải sử dụng đúng bảng màu Brand Guidelines của F-Code (Mã màu chủ đạo: Emerald #059669 và Slate #0f172a). File in ấn cần xuất hệ màu CMYK độ phân giải 300 DPI.',
        category: 'Truyền thông & Ấn phẩm',
        isPinned: false,
        updatedAt: '2026-08-25T09:00:00Z',
    },
];

// --- Mock Feedbacks ---
export const MOCK_FEEDBACKS: FeedbackResponse[] = [
    {
        id: 'fb-001',
        eventId: 'ev-tech-fall-2026',
        sourceType: 'ATTENDEE',
        fileUrl: 'https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com/feedbacks/fb-001.jpg',
        ratingScore: 5,
        highlightContent: 'Không khí bùng nổ, mentor chỉ dẫn cực kỳ nhiệt tình, đồ ăn teabreak ngon!',
        improvementContent: 'Phòng hội thảo hơi lạnh vào buổi chiều, ban tổ chức nên nhắc trước mang áo khoác.',
        customResponses: {
            favoriteSession: 'Workshop CI/CD with GitHub Actions',
            mentorHelpfulness: 5,
            recommendToFriend: true,
        },
        submittedAt: '2026-09-16T17:00:00Z',
    },
    {
        id: 'fb-002',
        eventId: 'ev-tech-fall-2026',
        sourceType: 'ATTENDEE',
        fileUrl: 'https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com/feedbacks/fb-002.pdf',
        ratingScore: 4,
        highlightContent: 'Đề bài thử thách mang tính thực tiễn cao, học được rất nhiều về AWS S3 & CloudFront.',
        improvementContent: 'Thời gian làm bài hackathon hơi gấp, cần thêm 2 tiếng để kiểm thử kỹ hơn.',
        customResponses: {
            favoriteSession: 'Hackathon Challenge 24h',
            mentorHelpfulness: 4,
            recommendToFriend: true,
        },
        submittedAt: '2026-09-16T17:45:00Z',
    },
    {
        id: 'fb-003',
        eventId: 'ev-tech-fall-2026',
        sourceType: 'ORGANIZER',
        fileUrl: 'https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com/feedbacks/fb-003.png',
        ratingScore: 5,
        highlightContent: 'Khâu phối hợp giữa Ban Kỹ thuật và Ban Hậu cần xử lý sự cố mạng rất nhịp nhàng.',
        improvementContent: 'Cần có bộ đàm nội bộ riêng cho từng trưởng ban để liên lạc nhanh hơn gọi điện.',
        customResponses: {
            internalCoordination: 4.8,
            stressLevel: 3,
        },
        submittedAt: '2026-09-16T19:30:00Z',
    },
];

export const MOCK_FEEDBACK_SUMMARY: FeedbackSummaryResponse = {
    totalFeedbacks: 3,
    averageRating: 4.67,
    ratingBreakdown: {
        5: 2,
        4: 1,
        3: 0,
        2: 0,
        1: 0,
    },
};
