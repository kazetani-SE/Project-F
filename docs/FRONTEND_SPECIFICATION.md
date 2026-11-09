# Đặc Tả Kiến Trúc & Giao Diện Người Dùng (Frontend Specification)
**Project F — Hệ Thống Quản Lý Tổ Chức Sự Kiện Câu Lạc Bộ (React 19 + TypeScript + Vite)**

Tài liệu này là quy chuẩn kỹ thuật cho toàn bộ tầng giao diện người dùng (Presentation Layer), đảm bảo tính nhất quán về trải nghiệm (UX), kiến trúc mã nguồn và luồng tích hợp với Backend APIs.

---

## 1. Công Nghệ & Thư Viện Cốt Lõi (Tech Stack)

| Thành phần | Công nghệ / Thư viện lựa chọn | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Framework** | **React 19** + **TypeScript** | Xây dựng UI hướng thành phần (Component-Driven) an toàn kiểu dữ liệu |
| **Build Tool** | **Vite** | Tốc độ dev server cực nhanh và đóng gói tối ưu cho SPA |
| **Routing** | **React Router DOM v6 / v7** | Điều hướng Single Page Application (SPA), hỗ trợ Nested Routes |
| **Styling** | **Tailwind CSS v3+** | Tiện ích giao diện tiện lợi, responsive và chuẩn hóa bảng màu |
| **Icons** | **Lucide React** (hoặc SVG Sprite) | Bộ icon hiện đại, kích thước nhẹ |
| **HTTP Client** | **Axios** (kèm Request/Response Interceptor) | Quản lý gọi API, tự động gắn Base URL `/api/v1` và Header xác thực |
| **Cloud Hosting** | **Amazon S3** + **Amazon CloudFront** | Lưu trữ tệp tĩnh và phân phối toàn cầu qua CDN với HTTPS |

---

## 2. Sơ Đồ Định Tuyến Người Dùng (Routing Map)

Tất cả các route yêu cầu thao tác trong một sự kiện cụ thể đều nằm dưới đường dẫn phụ thuộc `eventId` hoặc thông qua `ActiveEventContext`.

```text
/                                   -> Dashboard tổng quan (Trang chủ CLB)
├── /members                        -> Danh sách nhân sự CLB (Lọc ban, khóa, tìm kiếm)
│   ├── /members/new                -> Thêm mới thành viên
│   └── /members/:id                -> Hồ sơ chi tiết thành viên
│
├── /series                         -> Quản lý các Chuỗi sự kiện thường niên
│   └── /series/:id                 -> Chi tiết chuỗi sự kiện & lịch sử các mùa
│
├── /events                         -> Danh sách các Mùa sự kiện
│   ├── /events/new                 -> Khởi tạo mùa sự kiện mới
│   └── /events/:eventId            -> Bảng điều khiển chi tiết của Mùa sự kiện
│       ├── /overview               -> Tổng quan thông tin, tiến độ, ban tổ chức
│       │
│       ├── /finance                -> [Slice 2] Phân hệ Tài chính
│       │   ├── /dashboard          -> Biểu đồ ngân sách, quỹ còn lại, chênh lệch thực chi
│       │   ├── /budgets            -> Lập & duyệt bảng dự trù kinh phí (budget_items)
│       │   ├── /expenses           -> Danh sách thực chi, đính kèm hóa đơn S3 & duyệt chi
│       │   ├── /benchmarks         -> Master Catalog & bảng giá thị trường tham chiếu
│       │   └── /projected          -> Kế thừa & áp dụng tự động dự toán từ mùa trước
│       │
│       ├── /documents              -> [Slice 3] Kho tài liệu đề án & lịch sử phiên bản
│       ├── /media                  -> [Slice 3] Quản lý ấn phẩm truyền thông & in ấn
│       └── /knowledge              -> [Slice 3] Tri thức đa mùa
│           ├── /incidents          -> Nhật ký sự cố & bài học kinh nghiệm (Post-Mortem)
│           ├── /faqs               -> Kho câu hỏi thường gặp tích lũy
│           └── /feedbacks          -> Thống kê khảo sát ý kiến & phản hồi JSONB
│
└── /404                            -> Trang không tìm thấy tài nguyên
```

---

## 3. Khung Giao Diện Dùng Chung (App Shell & Layout)

Giao diện sử dụng bố cục **Dashboard Layout 2 cột**:
- **Sidebar (Thanh điều hướng bên trái)**:
  - Logo Project F & Bộ chuyển đổi Mùa sự kiện (`EventSwitcher` dropdown lấy từ `ActiveEventContext`).
  - Danh mục liên kết theo từng phân hệ: *Tổng quan*, *Nhân sự*, *Sự kiện*, *Tài chính & Ngân sách*, *Tài liệu & Ấn phẩm*, *Tri thức & Sự cố*.
- **Header (Thanh công cụ trên cùng)**:
  - Tên sự kiện hiện hành + Trạng thái (`PLANNING`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`).
  - Thông tin người dùng đang đăng nhập & Nút chuyển đổi giao diện nhanh.
- **Main Content Area (Vùng hiển thị nội dung)**:
  - Nơi render các trang thông qua `<Outlet />` của React Router.

---

## 4. Quản Lý Trạng Thái & Dữ Liệu Dùng Chung (State Management)

### 4.1. `ActiveEventContext` (Context Chọn Sự Kiện Đang Thao Tác)
Cho phép lưu trữ `currentEventId` trên `localStorage` và chia sẻ trạng thái cho toàn bộ các trang con:

```typescript
interface ActiveEventState {
  currentEvent: EventSummaryDto | null;
  setCurrentEvent: (event: EventSummaryDto) => void;
  isLoading: boolean;
}
```

### 4.2. Quản lý Tải Tệp Lên Amazon S3 (`useS3Upload` Hook)
Được xây dựng như một custom hook dùng chung cho toàn bộ dự án:

```typescript
interface UseS3UploadReturn {
  uploadFile: (file: File, category: 'RECEIPT' | 'DOCUMENT' | 'MEDIA' | 'FEEDBACK') => Promise<string>;
  isUploading: boolean;
  uploadProgress: number; // 0 -> 100%
  error: string | null;
}
```

**Luồng hoạt động của hook:**
1. Kiểm tra kích thước tệp tại Client (Hóa đơn $\le 15\text{MB}$, Tài liệu $\le 50\text{MB}$).
2. Gửi request tới Backend: `POST /api/v1/storage/presigned-upload`.
3. Nhận về `uploadUrl` (Pre-signed PUT URL).
4. Sử dụng Axios/Fetch gửi trực tiếp `file` nhị phân lên S3 qua `uploadUrl` kèm theo dõi tiến trình (`onUploadProgress`).
5. Trả về `fileUrl` định danh để Frontend gửi kèm request lưu vào cơ sở dữ liệu.

---

## 5. Tiêu Chuẩn Trạng Thái Giao Diện Bắt Buộc (UX State Standards)

Mỗi trang và component hiển thị dữ liệu bắt buộc phải hiện thực đủ **4 trạng thái**:

1. **Loading State**: Sử dụng **Skeleton Loader** (hiệu ứng bóng mờ nhấp nháy mô phỏng cấu trúc bảng/card), không sử dụng spinner xoay tròn toàn màn hình đơn điệu.
2. **Empty State**: Khi danh sách trả về rỗng (`items.length === 0`), hiển thị minh họa trực quan, thông điệp hướng dẫn rõ ràng (ví dụ: *"Chưa có khoản chi nào được ghi nhận. Bấm 'Thêm khoản chi' để bắt đầu"*).
3. **Error State**: Khi gọi API thất bại (4xx/5xx), hiển thị thông báo lỗi thân thiện (dựa trên `message` hoặc `errorCode` từ `ApiErrorResponse`) và nút **"Thử lại" (Retry)**.
4. **Interactive Action State**:
   - Khi thực hiện các hành động quan trọng (Xóa, Phê duyệt `APPROVED`, Từ chối `REJECTED`), bắt buộc hiển thị **Confirmation Modal** xác nhận.
   - Khi thao tác thành công, kích hoạt **Toast Notification** (xanh lá cây) góc phải màn hình trong 3 giây.
