import type { Row } from '../types/api'

export interface Field {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'file'
  required?: boolean
  options?: string[]
  optionsUrl?: (eventId: string, seriesId: string) => string
  optionLabel?: string
  category?: 'RECEIPT' | 'DOCUMENT' | 'MEDIA' | 'FEEDBACK'
}

export interface Action {
  label: string
  path: (eventId: string, seriesId: string, row: Row) => string
  body: Record<string, unknown> | ((row: Row) => Record<string, unknown>)
  reason?: boolean
  method?: 'PATCH' | 'DELETE'
}

export interface Resource {
  title: string
  description: string
  path: (eventId: string, seriesId: string) => string
  columns: string[]
  fields: Field[]
  actions?: Action[]
  prepare?: (values: Record<string, unknown>) => Record<string, unknown>
  afterCreate?: 'events'
}

const memberOptions = () => '/members?size=100'
const categoryOptions = () => '/finance/categories?size=100'
const benchmarkOptions = () => '/finance/benchmarks?size=100'
const seriesOptions = () => '/event-series?size=100'

export const resources: Record<string, Resource> = {
  members: {
    title: 'Thành viên CLB', description: 'Hồ sơ, ban chuyên môn và trạng thái hoạt động.',
    path: () => '/members', columns: ['studentId', 'fullName', 'email', 'department', 'clubRole', 'batch', 'isActive'],
    fields: [
      { key: 'studentId', label: 'Mã sinh viên (8 ký tự)', required: true },
      { key: 'fullName', label: 'Họ và tên', required: true },
      { key: 'email', label: 'Email', required: true },
      { key: 'phone', label: 'Số điện thoại' },
      { key: 'department', label: 'Ban', type: 'select', options: ['HR', 'PLAN', 'MEDIA', 'ACADEMIC'] },
      { key: 'clubRole', label: 'Vai trò CLB', type: 'select', options: ['MEMBER', 'VICEPRESIDENT', 'PRESIDENT'] },
      { key: 'batch', label: 'Khóa', required: true },
    ],
    actions: [{ label: 'Đổi trạng thái', path: (_e, _s, row) => `/members/${row.id}/status`, body: (row) => ({ isActive: !row.isActive }) }],
  },
  series: {
    title: 'Chuỗi sự kiện', description: 'Các sự kiện thường niên và lịch sử các mùa.',
    path: () => '/event-series', columns: ['name', 'description', 'createdAt'],
    fields: [{ key: 'name', label: 'Tên chuỗi', required: true }, { key: 'description', label: 'Mô tả', type: 'textarea' }],
  },
  events: {
    title: 'Mùa sự kiện', description: 'Tạo mùa mới và theo dõi vòng đời sự kiện.',
    path: () => '/events', columns: ['seasonName', 'title', 'status', 'expectedStartDate', 'expectedEndDate', 'allocatedFund'],
    fields: [
      { key: 'seriesId', label: 'Chuỗi sự kiện', type: 'select', optionsUrl: seriesOptions, optionLabel: 'name' },
      { key: 'seasonName', label: 'Tên mùa', required: true },
      { key: 'title', label: 'Tên sự kiện', required: true },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'expectedStartDate', label: 'Ngày bắt đầu dự kiến', type: 'date', required: true },
      { key: 'expectedEndDate', label: 'Ngày kết thúc dự kiến', type: 'date', required: true },
      { key: 'allocatedFund', label: 'Quỹ cấp phát', type: 'number', required: true },
    ], afterCreate: 'events',
  },
  organizers: {
    title: 'Ban tổ chức', description: 'Phân công thành viên và vai trò trong mùa sự kiện.',
    path: (eventId) => `/events/${eventId}/organizers`, columns: ['memberId', 'role', 'assignedTasks', 'joinedAt'],
    fields: [
      { key: 'memberId', label: 'Thành viên', type: 'select', optionsUrl: memberOptions, optionLabel: 'fullName', required: true },
      { key: 'role', label: 'Vai trò', type: 'select', options: ['HEAD_ORGANIZER', 'VICE_ORGANIZER', 'LEAD_FINANCE', 'LEAD_LOGISTICS', 'LEAD_MEDIA', 'LEAD_CONTENT', 'LEAD_EXTERNAL', 'MEMBER'], required: true },
      { key: 'assignedTasks', label: 'Nhiệm vụ', type: 'textarea' },
    ],
    actions: [{ label: 'Rút khỏi BTC', path: (e, _s, row) => `/events/${e}/organizers/${row.memberId}`, body: {}, method: 'DELETE' }],
  },
  categories: {
    title: 'Danh mục kinh phí', description: 'Nhóm chi phí dùng chung cho dự trù.',
    path: () => '/finance/categories', columns: ['name', 'description'],
    fields: [{ key: 'name', label: 'Tên danh mục', required: true }, { key: 'description', label: 'Mô tả', type: 'textarea' }],
  },
  benchmarks: {
    title: 'Bảng giá tham chiếu', description: 'Đơn giá thị trường cho vật tư và dịch vụ.',
    path: () => '/finance/benchmarks', columns: ['itemName', 'unit', 'currentMarketPrice', 'supplierReference'],
    fields: [
      { key: 'categoryId', label: 'Danh mục', type: 'select', optionsUrl: categoryOptions, optionLabel: 'name', required: true },
      { key: 'itemName', label: 'Tên vật tư', required: true },
      { key: 'unit', label: 'Đơn vị', required: true },
      { key: 'currentMarketPrice', label: 'Giá thị trường', type: 'number', required: true },
      { key: 'supplierReference', label: 'Nhà cung cấp' },
    ],
  },
  budgets: {
    title: 'Dự trù kinh phí', description: 'Hạng mục chi và quy trình phê duyệt.',
    path: (eventId) => `/events/${eventId}/budget-items`, columns: ['itemName', 'quantity', 'unit', 'estimatedUnitPrice', 'totalEstimatedAmount', 'approvalStatus'],
    fields: [
      { key: 'categoryId', label: 'Danh mục', type: 'select', optionsUrl: categoryOptions, optionLabel: 'name', required: true },
      { key: 'benchmarkId', label: 'Giá tham chiếu', type: 'select', optionsUrl: benchmarkOptions, optionLabel: 'itemName' },
      { key: 'itemName', label: 'Hạng mục', required: true },
      { key: 'quantity', label: 'Số lượng', type: 'number', required: true },
      { key: 'unit', label: 'Đơn vị', required: true },
      { key: 'estimatedUnitPrice', label: 'Đơn giá dự kiến', type: 'number', required: true },
      { key: 'notes', label: 'Ghi chú', type: 'textarea' },
    ],
    actions: [
      { label: 'Duyệt', path: (e, _s, row) => `/events/${e}/budget-items/${row.id}/approval`, body: { status: 'APPROVED' } },
      { label: 'Từ chối', path: (e, _s, row) => `/events/${e}/budget-items/${row.id}/approval`, body: { status: 'REJECTED' }, reason: true },
    ],
  },
  expenses: {
    title: 'Thực chi & hóa đơn', description: 'Ghi chi, tải hóa đơn và duyệt chi.',
    path: (eventId) => `/events/${eventId}/expenses`, columns: ['itemName', 'quantity', 'actualUnitPrice', 'totalAmount', 'paymentDate', 'status'],
    fields: [
      { key: 'budgetItemId', label: 'Hạng mục dự trù', type: 'select', optionsUrl: (e) => `/events/${e}/budget-items?size=100`, optionLabel: 'itemName' },
      { key: 'itemName', label: 'Tên khoản chi', required: true },
      { key: 'quantity', label: 'Số lượng', type: 'number', required: true },
      { key: 'actualUnitPrice', label: 'Đơn giá thực chi', type: 'number', required: true },
      { key: 'paymentDate', label: 'Ngày thanh toán', type: 'date', required: true },
      { key: 'receiptUrl', label: 'Hóa đơn (15 MB)', type: 'file', category: 'RECEIPT' },
      { key: 'notes', label: 'Ghi chú', type: 'textarea' },
    ],
    prepare: (values) => {
      const { receiptUrl, ...rest } = values
      return { ...rest, receipts: receiptUrl ? [{ imageUrl: receiptUrl }] : [] }
    },
    actions: [
      { label: 'Duyệt', path: (e, _s, row) => `/events/${e}/expenses/${row.id}/approval`, body: { status: 'APPROVED' } },
      { label: 'Từ chối', path: (e, _s, row) => `/events/${e}/expenses/${row.id}/approval`, body: { status: 'REJECTED' }, reason: true },
    ],
  },
  documents: {
    title: 'Tài liệu kế hoạch', description: 'Đề án, lịch sử phiên bản và phê duyệt.',
    path: (eventId) => `/events/${eventId}/documents`, columns: ['title', 'docType', 'version', 'status', 'createdAt'],
    fields: [
      { key: 'parentDocumentId', label: 'Phiên bản trước', type: 'select', optionsUrl: (e) => `/events/${e}/documents?size=100`, optionLabel: 'title' },
      { key: 'docType', label: 'Loại tài liệu', type: 'select', options: ['MASTER_PLAN', 'RUNNING_ORDER', 'SPONSOR_PROPOSAL', 'MEETING_MINUTES', 'RISK_PLAN', 'OTHER'], required: true },
      { key: 'title', label: 'Tiêu đề', required: true },
      { key: 'version', label: 'Phiên bản', required: true },
      { key: 'fileUrl', label: 'Tệp tài liệu (50 MB)', type: 'file', category: 'DOCUMENT', required: true },
    ],
    actions: [
      { label: 'Duyệt', path: (e, _s, row) => `/events/${e}/documents/${row.id}/approval`, body: { status: 'APPROVED' } },
      { label: 'Từ chối', path: (e, _s, row) => `/events/${e}/documents/${row.id}/approval`, body: { status: 'REJECTED' }, reason: true },
    ],
  },
  media: {
    title: 'Ấn phẩm truyền thông', description: 'Thiết kế, duyệt ấn phẩm và theo dõi in ấn.',
    path: (eventId) => `/events/${eventId}/media-assets`, columns: ['title', 'assetType', 'approvalStatus', 'isPrinted', 'createdAt'],
    fields: [
      { key: 'assetType', label: 'Loại ấn phẩm', type: 'select', options: ['POSTER', 'BANNER', 'STANDEE', 'BACKDROP', 'BADGE', 'TRAILER', 'SOCIAL_POST', 'OTHER'], required: true },
      { key: 'title', label: 'Tiêu đề', required: true },
      { key: 'specifications', label: 'Thông số', type: 'textarea' },
      { key: 'designFileUrl', label: 'Tệp thiết kế', type: 'file', category: 'MEDIA' },
    ],
    actions: [
      { label: 'Đã in', path: (e, _s, row) => `/events/${e}/media-assets/${row.id}/print-status`, body: { isPrinted: true } },
      { label: 'Duyệt', path: (e, _s, row) => `/events/${e}/media-assets/${row.id}/approval`, body: { status: 'APPROVED' } },
    ],
  },
  incidents: {
    title: 'Nhật ký sự cố', description: 'Ghi nhận nguyên nhân, xử lý và bài học sau sự kiện.',
    path: (eventId) => `/events/${eventId}/incidents`, columns: ['title', 'severity', 'rootCause', 'lessonLearned', 'createdAt'],
    fields: [
      { key: 'title', label: 'Tên sự cố', required: true },
      { key: 'severity', label: 'Mức độ', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
      { key: 'departmentInvolved', label: 'Các ban liên quan (cách nhau bởi dấu phẩy)', required: true },
      { key: 'incidentDescription', label: 'Mô tả', type: 'textarea', required: true },
      { key: 'rootCause', label: 'Nguyên nhân', type: 'textarea', required: true },
      { key: 'immediateSolution', label: 'Giải pháp tức thời', type: 'textarea', required: true },
      { key: 'lessonLearned', label: 'Bài học', type: 'textarea', required: true },
    ],
    prepare: (values) => ({ ...values, departmentInvolved: String(values.departmentInvolved).split(',').map((s) => s.trim().toUpperCase()) }),
  },
  faqs: {
    title: 'FAQ đa mùa', description: 'Câu hỏi thường gặp của chuỗi sự kiện.',
    path: (_e, seriesId) => `/event-series/${seriesId}/faqs`, columns: ['question', 'answer', 'category', 'isPinned'],
    fields: [
      { key: 'question', label: 'Câu hỏi', required: true },
      { key: 'answer', label: 'Câu trả lời', type: 'textarea', required: true },
      { key: 'category', label: 'Danh mục', required: true },
    ],
    actions: [{ label: 'Ghim/bỏ ghim', path: (_e, s, row) => `/event-series/${s}/faqs/${row.id}/pin`, body: (row) => ({ isPinned: !row.isPinned }) }],
  },
  feedbacks: {
    title: 'Khảo sát & phản hồi', description: 'Ý kiến sau sự kiện và điểm đánh giá.',
    path: (eventId) => `/events/${eventId}/feedbacks`, columns: ['sourceType', 'ratingScore', 'highlightContent', 'improvementContent', 'submittedAt'],
    fields: [
      { key: 'sourceType', label: 'Nguồn', type: 'select', options: ['ATTENDEE', 'ORGANIZER', 'SPONSOR', 'SPEAKER'], required: true },
      { key: 'ratingScore', label: 'Điểm (1–5)', type: 'number', required: true },
      { key: 'highlightContent', label: 'Điểm tốt', type: 'textarea' },
      { key: 'improvementContent', label: 'Cần cải thiện', type: 'textarea' },
      { key: 'fileUrl', label: 'Tệp phản hồi', type: 'file', category: 'FEEDBACK', required: true },
      { key: 'customResponses', label: 'Câu trả lời mở rộng (JSON)', type: 'textarea' },
    ],
    prepare: (values) => ({ ...values, customResponses: values.customResponses ? JSON.parse(String(values.customResponses)) : {} }),
  },
}
