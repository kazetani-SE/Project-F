# Hooks Package (`src/hooks`)

Thư mục này dùng để chứa các Custom React Hooks nhằm trừu tượng hóa và tái sử dụng logic:
- **useDebounce**: Hoãn xử lý input tìm kiếm để tránh gọi API liên tục.
- **useLocalStorage**: Tương tác đồng bộ hóa state với `window.localStorage`.
- **useMediaQuery**: Phát hiện kích thước màn hình responsive (Mobile, Tablet, Desktop).
- **useClickOutside**: Bắt sự kiện click ra bên ngoài để tự động đóng dropdown/modal.
- **useFetch / useQuery**: Quản lý trạng thái gọi dữ liệu (loading, data, error).
