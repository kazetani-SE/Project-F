package com.projectf;

import static org.assertj.core.api.Assertions.assertThat;

import com.projectf.common.config.OpenApiConfig;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OpenApiConfigurationTest {

    @Test
    @DisplayName("OpenAPI bean must configure title, version, server URL and JWT Bearer security scheme")
    void openApiBeanShouldBeConfiguredProperly() {
        OpenApiConfig config = new OpenApiConfig();
        OpenAPI openApi = config.customOpenAPI("/api");

        assertThat(openApi.getInfo()).isNotNull();
        assertThat(openApi.getInfo().getTitle()).isEqualTo("Project F - Club Management API");
        assertThat(openApi.getInfo().getVersion()).isEqualTo("1.0.0");
        assertThat(openApi.getServers()).isNotEmpty();
        assertThat(openApi.getServers().get(0).getUrl()).isEqualTo("/api");

        assertThat(openApi.getComponents()).isNotNull();
        SecurityScheme scheme = openApi.getComponents().getSecuritySchemes().get("bearerAuth");
        assertThat(scheme).isNotNull();
        assertThat(scheme.getType()).isEqualTo(SecurityScheme.Type.HTTP);
        assertThat(scheme.getScheme()).isEqualTo("bearer");
        assertThat(scheme.getBearerFormat()).isEqualTo("JWT");
    }
}
