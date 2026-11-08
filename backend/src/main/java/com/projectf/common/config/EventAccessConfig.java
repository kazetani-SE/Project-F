package com.projectf.common.config;

import com.projectf.common.security.AccessPolicy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class EventAccessConfig implements WebMvcConfigurer {
    private final AccessPolicy access;

    public EventAccessConfig(AccessPolicy access) {
        this.access = access;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                Object pathVariables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
                if (pathVariables instanceof Map<?, ?> variables && variables.get("eventId") instanceof String eventId) {
                    access.requireEvent(UUID.fromString(eventId));
                }
                return true;
            }
        }).addPathPatterns("/v1/events/**", "/v1/finance/summary/**");
    }
}
