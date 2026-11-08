package com.projectf.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình OpenAPI 3.0 / Swagger UI cho hệ thống Project F Club Management API.
 */
@Configuration
public class OpenApiConfig {

    private static final String AUTH_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI customOpenAPI(@Value("${server.servlet.context-path:/api}") String contextPath) {
        Info apiInfo = new Info()
                .title("Project F - Club Management API")
                .description("""
                        Tài liệu đặc tả RESTful API cho Hệ thống Quản lý Tổ chức Sự kiện Câu lạc bộ (Project F).
                        
                        ### Các phân hệ chính:
                        - **Storage**: Cung cấp AWS S3 Pre-signed URL cho upload và download tệp tin an toàn (giới hạn 15MB/50MB).
                        - **Document**: Quản lý hồ sơ, tài liệu sự kiện và luồng phê duyệt tài liệu.
                        - **Media Assets**: Quản lý ấn phẩm truyền thông, thiết kế sự kiện và trạng thái in ấn.
                        - **Finance**: Lập dự toán, định mức chi phí, phát sinh chi tiêu, quản lý hóa đơn và báo cáo ngân sách.
                        - **Knowledge**: Quản lý tri thức sự kiện bao gồm Sự cố (Incidents), FAQs và Khảo sát phản hồi (Feedbacks).
                        - **Member & Event**: Quản lý thành viên CLB, chuỗi sự kiện, mùa sự kiện và nhân sự ban tổ chức.
                        """)
                .version("1.0.0")
                .contact(new Contact()
                        .name("Project F Engineering Team")
                        .url("https://github.com/kazetani-SE/Project-F"))
                .license(new License()
                        .name("Apache 2.0")
                        .url("https://www.apache.org/licenses/LICENSE-2.0"));

        SecurityScheme scheme = new SecurityScheme()
                .name(AUTH_SCHEME)
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Nhập Bearer Token (Supabase JWT) để xác thực các yêu cầu API được bảo vệ.");

        return new OpenAPI()
                .info(apiInfo)
                .servers(List.of(
                        new Server().url(contextPath).description("Default API Gateway / Context Path")
                ))
                .addSecurityItem(new SecurityRequirement().addList(AUTH_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(AUTH_SCHEME, scheme));
    }
}
