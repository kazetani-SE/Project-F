package com.projectf.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    private final String origins;

    public CorsConfig(@Value("${app.cors-origins:http://localhost:5173}") final String origins) {
        this.origins = origins;
    }

    @Override
    public void addCorsMappings(final CorsRegistry registry) {
        registry.addMapping("/v1/**").allowedOrigins(origins.split(","))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type");
    }
}
