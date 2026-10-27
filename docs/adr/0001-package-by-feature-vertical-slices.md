# Package-by-Feature (Vertical Slice Architecture)

## Context & Decision
Dự án được phát triển bởi đội ngũ 3 thành viên full-stack theo mô hình làm chủ tính năng độc lập. Chúng tôi quyết định tổ chức mã nguồn Backend theo kiến trúc **Package-by-Feature (Vertical Slice)** thay vì Package-by-Layer truyền thống. Mỗi thư mục tính năng trong `com.projectf.features.<feature_name>` tự chứa đầy đủ các tầng `controller`, `service`, `repository`, `entity`, `dto`, và `mapper` của riêng mình.

## Consequences
- Giảm thiểu tối đa xung đột mã nguồn (merge conflicts) khi các thành viên làm việc song song trên các nhánh tính năng khác nhau.
- Tăng tính gắn kết cao (High Cohesion) và giảm phụ thuộc lỏng lẻo (Loose Coupling) giữa các phân hệ nghiệp vụ.
- Giữa các feature, việc liên kết thực thể được ưu tiên qua định danh (`UUID id`) thay vì tham chiếu quan hệ JPA `@ManyToOne` trực tiếp, giúp việc kiểm thử đơn vị và tích hợp của từng lát cắt diễn ra độc lập.
