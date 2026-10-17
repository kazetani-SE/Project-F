# Utils Package (`src/utils`)

Thư mục này dùng để chứa các hàm tiện ích thuần túy (Pure Helper Functions):
- **Formatters**: Định dạng tiền tệ (VND, USD), định dạng ngày giờ (`Intl.DateTimeFormat` hoặc date-fns), format số điện thoại, viết hoa chữ cái đầu.
- **Validators**: Kiểm tra định dạng email, mật khẩu mạnh, căn cước, số điện thoại.
- **Storage Helpers**: Wrapper tiện ích để lưu/lấy dữ liệu an toàn từ `localStorage` có parse JSON và xử lý lỗi.
- **String / Array / Object Helpers**: Các hàm xử lý chuỗi slug, lọc mảng, gom nhóm dữ liệu (groupBy), debounce/throttle.
