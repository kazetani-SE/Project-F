package com.projectf.common.config;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;
@Configuration
// Spring khởi tạo config bằng constructor mặc định; không cần constructor rỗng tường minh.
@SuppressWarnings("PMD.AtLeastOneConstructor")
public class CorsConfig {
 @Bean
 public CorsConfigurationSource corsConfigurationSource(
  @Value("${CORS_ALLOWED_ORIGINS:http://localhost:5173}") final String origins) {
  final CorsConfiguration config=new CorsConfiguration();
  config.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
  config.setAllowedMethods(java.util.List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
  config.setAllowedHeaders(java.util.List.of("Authorization","Content-Type","Accept","X-Requested-With",
   "Origin","Access-Control-Request-Method","Access-Control-Request-Headers"));
  final UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();
  source.registerCorsConfiguration("/**",config);
  return source;
 }
}
