# Context Package (`src/context`)

Thư mục này dùng để quản lý State toàn cục (Global State) bằng React Context API hoặc State Management library:
- **AuthContext**: Quản lý thông tin đăng nhập, token xác thực, quyền người dùng (roles/permissions).
- **ThemeContext**: Quản lý trạng thái giao diện sáng/tối (Dark/Light mode).
- **NotificationContext**: Quản lý hệ thống hiển thị thông báo nổi (Toast/Alert) toàn ứng dụng.
- **Custom Providers**: Kết nối nhiều context providers thông qua một `AppProviders` bọc ngoài ứng dụng.
