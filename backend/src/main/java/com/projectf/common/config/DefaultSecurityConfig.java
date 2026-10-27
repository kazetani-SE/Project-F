package com.projectf.common.config;
import org.springframework.context.annotation.*;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
@Configuration
@Profile("!dev")
@SuppressWarnings("PMD.AtLeastOneConstructor")
public class DefaultSecurityConfig {
 @Bean
 public SecurityFilterChain defaultSecurityFilterChain(final HttpSecurity http) throws Exception {
  // Chưa có Supabase Auth/RBAC: các môi trường khác dev chặn mặc định để tránh lộ API.
  return http.csrf(AbstractHttpConfigurer::disable).cors(Customizer.withDefaults())
   .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
   .authorizeHttpRequests(auth -> auth.anyRequest().denyAll()).build();
 }
}
