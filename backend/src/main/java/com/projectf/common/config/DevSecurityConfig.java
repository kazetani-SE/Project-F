package com.projectf.common.config;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
@Configuration
@Profile("dev")
@SuppressWarnings("PMD.AtLeastOneConstructor")
public class DevSecurityConfig {
 @Bean
 public SecurityFilterChain devSecurityFilterChain(final HttpSecurity http) throws Exception {
  // CHỈ profile dev được mở API để team phát triển; tuyệt đối không bật dev ở production.
  return http.csrf(AbstractHttpConfigurer::disable).cors(Customizer.withDefaults())
   .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
   .authorizeHttpRequests(auth -> auth.anyRequest().permitAll()).build();
 }
}
