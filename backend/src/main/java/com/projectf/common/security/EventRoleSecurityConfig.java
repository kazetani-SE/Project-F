package com.projectf.common.security;

import java.util.UUID;
import java.lang.reflect.Method;
import org.springframework.aop.support.AopUtils;
import org.springframework.aop.support.annotation.AnnotationMatchingPointcut;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.expression.MethodBasedEvaluationContext;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.method.AuthorizationManagerBeforeMethodInterceptor;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
public class EventRoleSecurityConfig {
    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    static AuthorizationManagerBeforeMethodInterceptor eventRoleAuthorization(AccessPolicy policy) {
        return new AuthorizationManagerBeforeMethodInterceptor(
                new AnnotationMatchingPointcut(null, RequireEventRoles.class, true), (authentication, invocation) -> {
                    Method method = AopUtils.getMostSpecificMethod(invocation.getMethod(), invocation.getThis().getClass());
                    RequireEventRoles rule = AnnotatedElementUtils.findMergedAnnotation(method, RequireEventRoles.class);
                    MethodBasedEvaluationContext evaluation = new MethodBasedEvaluationContext(invocation.getThis(), method,
                            invocation.getArguments(), new DefaultParameterNameDiscoverer());
                    Object id = new SpelExpressionParser().parseExpression(rule.eventId()).getValue(evaluation);
                    boolean allowed = id instanceof UUID eventId
                            && policy.hasAnyEventRole(eventId, authentication.get(), rule.value());
                    return new AuthorizationDecision(allowed);
                });
    }
}
