# Đặc Tả Hợp Đồng REST API (RESTful API Contract Specification)
**Project F — Hệ Thống Quản Lý Tổ Chức Sự Kiện Câu Lạc Bộ (Spec-Driven Development)**

Tài liệu này là **Nguồn Chuẩn Duy Nhất (Single Source of Truth - SSOT)** quy định cấu trúc các RESTful API của hệ thống. Đội ngũ phát triển Backend và Frontend (cũng như các AI Coding Agents) bắt buộc phải tuân thủ nghiêm ngặt các đường dẫn, phương thức, cấu trúc Request/Response DTO và mã lỗi được định nghĩa tại đây.

---

## 1. Quy Chuẩn Kỹ Thuật Chung (Global Conventions)

- **Giao thức & Định dạng**: `HTTP/1.1` & `HTTPS`, dữ liệu trao đổi định dạng `application/json; charset=UTF-8`.
- **Tiền tố đường dẫn (Base URL)**: `/api/v1`
- **Định dạng thời gian**: Chuỗi chuẩn ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`) cho các trường `timestamp` / `TIMESTAMPTZ`, và `YYYY-MM-DD` cho các trường `DATE`.
- **Quy ước đặt tên trường trong JSON**: Toàn bộ thuộc tính sử dụng định dạng **`camelCase`**.

### 1.1. Cấu trúc Response Chuẩn (Envelope ApiResponse<T>)

Mọi API trả về dữ liệu đều được bọc trong cấu trúc chuẩn:

```typescript
// Phản hồi thành công (HTTP 200 / 201)
interface ApiResponse<T> {
  success: boolean;       // true
  message: string;        // Thông báo phản hồi người dùng (tiếng Việt hoặc Anh)
  data: T;                // Dữ liệu nghiệp vụ trả về (Object, Array hoặc null)
  errorCode: null;
  timestamp: string;      // ISO 8601 string: 2026-10-25T14:00:00Z
}

// Phản hồi thất bại (HTTP 4xx / 5xx)
interface ApiErrorResponse {
  success: boolean;       // false
  message: string;        // Mô tả ngắn lỗi phát sinh
  data: null;
  errorCode: string;      // Mã định danh lỗi nghiệp vụ (ví dụ: EXPENSE_MISSING_RECEIPT)
  errorDetails?: Array<{  // Chi tiết lỗi validate (nếu là lỗi 400 Validation)
    field: string;
    rejectedValue: any;
    message: string;
  }>;
  timestamp: string;
}
```

### 1.2. Cấu trúc Phân trang Chuẩn (PageResponse<T>)

Đối với các API danh sách có phân trang (sử dụng query params: `page` (bắt đầu từ 0), `size` (mặc định 10), `sort` (ví dụ `createdAt,desc`)):

```typescript
interface PageResponse<T> {
  items: T[];
  pageNumber: number;     // 0-indexed
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  hasNext: boolean;
}
```

### 1.3. Bảng Mã Lỗi Nghiệp Vụ Chuẩn (Business Error Codes)

| Mã lỗi (errorCode) | HTTP Status | Mô tả nghiệp vụ |
| :--- | :--- | :--- |
| `VALIDATION_FAILED` | 400 | Dữ liệu đầu vào không hợp lệ theo quy chuẩn validation (@Valid) |
| `UNAUTHORIZED` | 401 | Thiếu hoặc token xác thực không hợp lệ / đã hết hạn |
| `FORBIDDEN` | 403 | Người dùng không đủ quyền hạn thực hiện hành động này |
| `RESOURCE_NOT_FOUND` | 404 | Không tìm thấy tài nguyên theo ID cung cấp |
| `DUPLICATE_RESOURCE` | 409 | Vi phạm ràng buộc duy nhất (ví dụ: student_id hoặc email đã tồn tại) |
| `EXPENSE_RECEIPT_REQUIRED` | 400 | Khoản chi bắt buộc phải có ít nhất 1 chứng từ hóa đơn trước khi duyệt APPROVED |
| `BUDGET_OVER_ALLOCATED` | 400 | Tổng chi vượt quá hạn mức quỹ được cấp phát cho mùa sự kiện |
| `INVALID_EVENT_DATE_RANGE` | 400 | Ngày kết thúc không được trước ngày bắt đầu |
| `FILE_SIZE_EXCEEDED` | 400 | Kích thước tệp vượt quá hạn mức (15MB cho hóa đơn, 50MB cho tài liệu) |
| `UNSUPPORTED_FILE_TYPE` | 400 | Định dạng tệp không được hỗ trợ |
| `INTERNAL_SERVER_ERROR` | 500 | Lỗi xử lý ngoại lệ nội bộ của hệ thống |

---

## 2. Chi Tiết API Phân Hệ 1: Nhân Sự CLB & Ban Tổ Chức (Slice 1)

### 2.1. Quản lý Thành viên CLB (`club_members`)

- **`GET /api/v1/members`**
  - **Mô tả**: Lấy danh sách thành viên CLB có lọc và phân trang.
  - **Query Params**: `page=0`, `size=10`, `department` (HR|PLAN|MEDIA|ACADEMIC), `role` (PRESIDENT|VICEPRESIDENT|MEMBER), `batch` (khóa K18, K19...), `isActive` (boolean), `keyword` (tìm theo tên, studentId, email).
  - **Response 200**: `ApiResponse<PageResponse<MemberResponseDto>>`

- **`GET /api/v1/members/{id}`**
  - **Response 200**: `ApiResponse<MemberResponseDto>`

- **`POST /api/v1/members`**
  - **Mô tả**: Thêm mới thành viên CLB.
  - **Request Body**:
    ```json
    {
      "studentId": "SE170123",
      "fullName": "Nguyễn Văn A",
      "email": "anvse170123@fpt.edu.vn",
      "phone": "0912345678",
      "department": "PLAN",
      "clubRole": "MEMBER",
      "batch": "K17"
    }
    ```
  - **Response 201**: `ApiResponse<MemberResponseDto>`

- **`PUT /api/v1/members/{id}`**
  - **Mô tả**: Cập nhật thông tin thành viên.
  - **Response 200**: `ApiResponse<MemberResponseDto>`

- **`PATCH /api/v1/members/{id}/status`**
  - **Mô tả**: Chuyển trạng thái hoạt động / ngừng hoạt động (`isActive: false`, ghi nhận `inactiveAt`).
  - **Request Body**: `{ "isActive": false }`
  - **Response 200**: `ApiResponse<MemberResponseDto>`

### 2.2. Quản lý Ban Tổ Chức Sự Kiện (`event_organizers`)

- **`GET /api/v1/events/{eventId}/organizers`**
  - **Mô tả**: Lấy danh sách thành viên BTC của một mùa sự kiện.
  - **Response 200**: `ApiResponse<List<OrganizerResponseDto>>`

- **`POST /api/v1/events/{eventId}/organizers`**
  - **Mô tả**: Phân công thành viên CLB vào Ban Tổ Chức sự kiện.
  - **Request Body**:
    ```json
    {
      "memberId": "123e4567-e89b-12d3-a456-426614174000",
      "role": "MASTER_PLAN",
      "assignedTasks": "Chịu trách nhiệm đề án tổng thể và timeline"
    }
    ```
  - **Response 201**: `ApiResponse<OrganizerResponseDto>`

- **`DELETE /api/v1/events/{eventId}/organizers/{memberId}`**
  - **Mô tả**: Rút thành viên khỏi BTC sự kiện.
  - **Response 200**: `ApiResponse<null>`

---

## 3. Chi Tiết API Phân Hệ 2: Chuỗi Sự Kiện & Mùa Sự Kiện (Slice 1)

### 3.1. Quản lý Chuỗi Sự kiện (`event_series`)

- **`GET /api/v1/event-series`**: Lấy danh sách chuỗi sự kiện thường niên.
- **`POST /api/v1/event-series`**: Tạo chuỗi sự kiện mới.
  - **Request Body**: `{ "name": "F-Code Hackathon", "description": "Cuộc thi lập trình thường niên" }`
- **`GET /api/v1/event-series/{id}`**: Lấy chi tiết chuỗi sự kiện kèm danh sách các mùa đã tổ chức.

### 3.2. Quản lý Mùa Sự kiện (`events`)

- **`GET /api/v1/events`**
  - **Query Params**: `seriesId`, `status` (PLANNING|APPROVED|IN_PROGRESS|COMPLETED|CANCELLED), `page`, `size`.
  - **Response 200**: `ApiResponse<PageResponse<EventSummaryDto>>`

- **`GET /api/v1/events/{id}`**: Lấy thông tin chi tiết mùa sự kiện.
- **`POST /api/v1/events`**
  - **Request Body**:
    ```json
    {
      "seriesId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "seasonName": "Season 2026",
      "title": "F-Code Hackathon 2026 - AI Era",
      "description": "Mùa giải lần thứ 5",
      "expectedStartDate": "2026-11-15",
      "expectedEndDate": "2026-11-20",
      "allocatedFund": 25000000.00
    }
    ```
  - **Response 201**: `ApiResponse<EventDetailDto>`

- **`PATCH /api/v1/events/{id}/status`**
  - **Mô tả**: Cập nhật trạng thái vòng đời mùa sự kiện.
  - **Request Body**: `{ "status": "IN_PROGRESS", "actualStartDate": "2026-11-15" }`
  - **Response 200**: `ApiResponse<EventDetailDto>`

---

## 4. Chi Tiết API Phân Hệ 3: Tài Chính, Ngân Sách & Dự Toán (Slice 2)

### 4.1. Danh mục & Bảng giá tham chiếu thị trường (Master Catalog)

- **`GET /api/v1/finance/categories`**: Lấy danh mục kinh phí (`budget_categories`).
- **`POST /api/v1/finance/categories`**: Tạo danh mục kinh phí mới.
- **`GET /api/v1/finance/benchmarks`**: Tra cứu bảng giá thị trường chuẩn (`item_price_benchmarks`).
  - **Query Params**: `categoryId`, `keyword`.
- **`POST /api/v1/finance/benchmarks`**: Khởi tạo/cập nhật đơn giá thị trường cho một vật tư.
  - **Request Body**:
    ```json
    {
      "categoryId": "123e4567-e89b-12d3-a456-426614174000",
      "itemName": "Bạt Hiflex in ấn",
      "unit": "m2",
      "currentMarketPrice": 45000.00,
      "supplierReference": "Nhà in Thành Danh"
    }
    ```

### 4.2. Dự trù kinh phí (`budget_items`)

- **`GET /api/v1/events/{eventId}/budget-items`**: Lấy danh sách hạng mục dự trù của sự kiện.
- **`POST /api/v1/events/{eventId}/budget-items`**: Tạo hạng mục dự trù mới.
  - **Request Body**:
    ```json
    {
      "categoryId": "123e4567-e89b-12d3-a456-426614174000",
      "benchmarkId": "223e4567-e89b-12d3-a456-426614174000",
      "itemName": "In Backdrop sân khấu",
      "quantity": 15.0,
      "unit": "m2",
      "estimatedUnitPrice": 45000.00,
      "notes": "Backdrop hội trường chính"
    }
    ```
- **`PATCH /api/v1/events/{eventId}/budget-items/{itemId}/approval`**: Phê duyệt hoặc từ chối dự trù.
  - **Request Body**: `{ "status": "APPROVED", "rejectionReason": null }`

### 4.3. Khoản chi thực tế & Hóa đơn chứng từ (`expenses`, `expense_receipts`)

- **`GET /api/v1/events/{eventId}/expenses`**: Danh sách thực chi của sự kiện.
- **`POST /api/v1/events/{eventId}/expenses`**: Tạo khoản chi thực tế.
  - **Request Body**:
    ```json
    {
      "budgetItemId": "323e4567-e89b-12d3-a456-426614174000",
      "itemName": "Thanh toán in ấn Backdrop",
      "quantity": 15.0,
      "actualUnitPrice": 42000.00,
      "paidBy": "423e4567-e89b-12d3-a456-426614174000",
      "paymentDate": "2026-11-14",
      "receipts": [
        {
          "receiptCode": "HD-00129",
          "imageUrl": "https://project-f-media.s3.ap-southeast-1.amazonaws.com/receipts/...",
          "supplierName": "Công ty TNHH In Ấn Sài Gòn"
        }
      ]
    }
    ```
- **`PATCH /api/v1/events/{eventId}/expenses/{expenseId}/approval`**:
  - **Quy tắc bắt buộc**: Nếu `status == 'APPROVED'`, hệ thống kiểm tra bảng `expense_receipts` phải có ít nhất 1 chứng từ, nếu không có sẽ ném lỗi `EXPENSE_RECEIPT_REQUIRED` (HTTP 400).

### 4.4. Thống kê & Dự toán Thông minh (Views)

- **`GET /api/v1/events/{eventId}/budget-summary`**: Lấy dữ liệu tổng hợp ngân sách thời gian thực từ View `v_event_budget_summary` (`allocatedFund`, `totalBudgetEstimated`, `totalActualSpent`, `remainingAllocatedFund`, `varianceAgainstEstimate`).
- **`GET /api/v1/events/{eventId}/projected-budget`**: Lấy danh sách dự toán gợi ý cho mùa mới từ View `v_projected_budget_from_previous_season`.
- **`POST /api/v1/events/{eventId}/apply-projected-budget`**: Sao chép tự động toàn bộ danh mục dự toán đề xuất vào bảng `budget_items` của mùa mới ở trạng thái `PENDING`.

---

## 5. Chi Tiết API Phân Hệ 4: Dịch Vụ Lưu Trữ Amazon S3 (Slice 3)

- **`POST /api/v1/storage/presigned-upload`**
  - **Mô tả**: Sinh URL tải lên S3 có chữ ký bảo mật.
  - **Request Body**:
    ```json
    {
      "fileName": "hoa-don-nuoc-uong.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 3145728,
      "category": "RECEIPT" // Các giá trị: RECEIPT | DOCUMENT | MEDIA | FEEDBACK
    }
    ```
  - **Quy tắc kiểm tra**:
    - `category == 'RECEIPT'`: `fileSize <= 15MB`, `mimeType in [image/jpeg, image/png, image/webp, application/pdf]`
    - `category in ['DOCUMENT', 'MEDIA', 'FEEDBACK']`: `fileSize <= 50MB`
  - **Response 200**:
    ```json
    {
      "success": true,
      "data": {
        "uploadUrl": "https://project-f-media.s3.ap-southeast-1.amazonaws.com/receipts/uuid-key.jpg?AWSAccessKeyId=...",
        "fileUrl": "https://project-f-media.s3.ap-southeast-1.amazonaws.com/receipts/uuid-key.jpg",
        "objectKey": "receipts/uuid-key.jpg",
        "expiresInMinutes": 10
      }
    }
    ```

- **`GET /api/v1/storage/presigned-download`**
  - **Query Params**: `objectKey` (hoặc `fileUrl`).
  - **Response 200**: Trả về Pre-signed GET URL có thời hạn để xem/tải tệp bảo mật.

---

## 6. Chi Tiết API Phân Hệ 5: Tài Liệu, Ấn Phẩm & Tri Thức Đa Mùa (Slice 3)

### 6.1. Tài liệu Kế hoạch & Phiên bản (`event_documents`)

- **`GET /api/v1/events/{eventId}/documents`**: Danh sách tài liệu kế hoạch (có thể xem theo cấu trúc cây phiên bản với `parentDocumentId`).
- **`POST /api/v1/events/{eventId}/documents`**: Tải lên đề án/kế hoạch mới.
  - **Request Body**:
    ```json
    {
      "parentDocumentId": null,
      "docType": "MASTER_PLAN",
      "title": "Kế hoạch tổng thể F-Code Hackathon 2026",
      "version": "1.0",
      "fileUrl": "https://s3.../documents/plan-v1.pdf"
    }
    ```
- **`PATCH /api/v1/events/{eventId}/documents/{documentId}/approval`**: Duyệt/từ chối tài liệu kế hoạch.

### 6.2. Ấn phẩm Truyền thông & Trạng thái in ấn (`event_media_assets`)

- **`GET /api/v1/events/{eventId}/media-assets`**: Danh sách ấn phẩm thiết kế.
- **`POST /api/v1/events/{eventId}/media-assets`**: Thêm ấn phẩm mới.
- **`PATCH /api/v1/events/{eventId}/media-assets/{assetId}/print-status`**: Cập nhật trạng thái in ấn (`isPrinted: true`).

### 6.3. Tri thức Đa mùa: Sự cố, FAQ & Khảo sát (`event_incidents`, `event_faqs`, `event_feedbacks`)

- **`GET /api/v1/events/{eventId}/incidents`**: Danh sách nhật ký sự cố của sự kiện.
- **`POST /api/v1/events/{eventId}/incidents`**: Ghi nhận sự cố & Post-Mortem.
  - **Request Body**:
    ```json
    {
      "title": "Mất kết nối Internet phòng thi vòng chung kết",
      "severity": "CRITICAL",
      "departmentInvolved": ["HR", "PLAN"],
      "incidentDescription": "Cáp quang mạng bị đứt lúc 14:00 gây gián đoạn thi đấu 30 phút",
      "rootCause": "Không có đường truyền mạng 4G dự phòng",
      "immediateSolution": "Kích hoạt 3 bộ phát WiFi 4G di động của ban tổ chức",
      "lessonLearned": "Mọi sự kiện lập trình bắt buộc chuẩn bị 2 đường mạng song song độc lập"
    }
    ```

- **`GET /api/v1/event-series/{seriesId}/faqs`**: Tra cứu kho FAQ tích lũy của chuỗi sự kiện.
- **`POST /api/v1/event-series/{seriesId}/faqs`**: Thêm câu hỏi thường gặp mới.
- **`PATCH /api/v1/event-series/{seriesId}/faqs/{faqId}/pin`**: Ghim/bỏ ghim FAQ lên đầu danh mục.

- **`GET /api/v1/events/{eventId}/feedbacks`**: Lấy danh sách và thống kê điểm đánh giá khảo sát sau sự kiện.
- **`POST /api/v1/events/{eventId}/feedbacks`**: Nộp phiếu khảo sát đánh giá.
  - **Request Body**:
    ```json
    {
      "sourceType": "ATTENDEE",
      "fileUrl": "https://s3.../feedbacks/form-01.pdf",
      "ratingScore": 5,
      "highlightContent": "Chủ đề cuộc thi rất thực tế và ban giám khảo chấm điểm công tâm",
      "improvementContent": "Phòng thi đấu hơi lạnh, cần nhắc thí sinh mang áo khoác",
      "customResponses": {
        "wouldRecommend": true,
        "favoriteTopic": "Machine Learning",
        "networkingRating": 4
      }
    }
    ```
