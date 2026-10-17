# Services Package (`src/services`)

Thư mục này chịu trách nhiệm giao tiếp mạng (Network Layer) và gọi REST/GraphQL API:
- **apiClient**: Cấu hình Axios instance hoặc wrapper Fetch API với Base URL, headers, timeout.
- **Interceptors**: Tự động gán Authorization Bearer token vào request và xử lý bắt lỗi tập trung (401 Unauthorized, 403 Forbidden, 500 Server Error).
- **Service Modules**: Mỗi module phụ trách một nhóm API nghiệp vụ riêng biệt.
  Ví dụ: `authService.ts`, `userService.ts`, `uploadService.ts`.
