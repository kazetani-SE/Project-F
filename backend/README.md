# Project F - Backend (Spring Boot + Supabase)

Dự án Backend khởi tạo cho Hệ thống quản lý Câu lạc bộ **Project F**.

## 📌 Công nghệ sử dụng
- **Java**: 21 (LTS)
- **Framework**: Spring Boot 3.3.4
- **Database**: PostgreSQL (Cloud Supabase)
- **ORM / Persistence**: Spring Data JPA / Hibernate
- **Validation**: Jakarta Validation API
- **Build Tool**: Apache Maven (kèm sẵn Maven Wrapper `mvnw`, `mvnw.cmd`)

## ⚙️ Cấu hình Supabase PostgreSQL
Khi bạn bắt đầu viết mã trong `src/`, hãy tạo `src/main/resources/application.yml` với thông tin kết nối Supabase của bạn:

```yaml
server:
  port: 8080

spring:
  application:
    name: project-f-club-backend
  datasource:
    url: ${SUPABASE_DB_URL:jdbc:postgresql://db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require}
    username: ${SUPABASE_DB_USER:postgres}
    password: ${SUPABASE_DB_PASSWORD:[YOUR-PASSWORD]}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
```

## 🚀 Khởi chạy dự án
Chạy lệnh bằng Maven Wrapper (không cần cài đặt Maven trên máy):

- **Windows (PowerShell / CMD)**:
  ```powershell
  .\mvnw.cmd spring-boot:run
  ```

- **Linux / macOS**:
  ```bash
  ./mvnw spring-boot:run
  ```
