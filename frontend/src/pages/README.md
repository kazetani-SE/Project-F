# Pages Package (`src/pages`)

Thư mục này dùng để chứa các màn hình/trang chính tương ứng với hệ thống điều hướng (Routing):
- Mỗi page đại diện cho một URL path cụ thể trong ứng dụng.
- Ghép nối các `components`, kích hoạt dữ liệu từ `services` và `hooks`.
- Các trang phổ biến: `HomePage`, `DashboardPage`, `NotFoundPage` (404), `LoginPage`, v.v.
- Tổ chức theo thư mục con nếu mỗi trang có components cục bộ riêng biệt:
  ```
  pages/
  ├── dashboard/
  │   ├── index.tsx
  │   └── components/
  └── not-found/
      └── index.tsx
  ```
