package com.projectf.features.member.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.projectf.features.member.dto.response.MemberResponse;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class MemberCredentialService {
    private final JdbcTemplate jdbc;
    private final RestClient auth;
    private final JavaMailSender mail;
    private final String sender;
    private final String loginUrl;
    private final SecureRandom random = new SecureRandom();

    public MemberCredentialService(JdbcTemplate jdbc, JavaMailSender mail,
            @Value("${SUPABASE_AUTH_ISSUER}") String issuer,
            @Value("${SUPABASE_SERVICE_ROLE_KEY:}") String serviceKey,
            @Value("${APP_MAIL_FROM:}") String sender,
            @Value("${APP_LOGIN_URL:http://localhost:5173/login}") String loginUrl) {
        this.jdbc = jdbc;
        this.mail = mail;
        this.sender = sender;
        this.loginUrl = loginUrl;
        this.auth = RestClient.builder().baseUrl(issuer)
                .defaultHeader("apikey", serviceKey)
                .defaultHeader("Authorization", "Bearer " + serviceKey).build();
    }

    public String provision(MemberResponse member) {
        // Auth user đã tồn tại giữ nguyên mật khẩu; chỉ liên kết hồ sơ theo email đã xác nhận.
        UUID existing = jdbc.query("select id from auth.users where lower(email)=lower(?) and email_confirmed_at is not null",
                (rs, row) -> rs.getObject(1, UUID.class), member.email()).stream().findFirst().orElse(null);
        String result;
        if (existing != null) {
            link(member, existing);
            result = "AUTH_EXISTS";
        } else {
            byte[] bytes = new byte[24];
            random.nextBytes(bytes);
            String password = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            AuthUser created = auth.post().uri("/admin/users")
                    .body(Map.of("email", member.email(), "password", password, "email_confirm", true))
                    .retrieve().body(AuthUser.class);
            if (created == null || created.id() == null) {
                throw new IllegalStateException("Auth user was not created");
            }
            link(member, created.id());
            send(member, password);
            result = "CREATED";
        }
        return result;
    }

    public void resend(MemberResponse member) {
        UUID authId = jdbc.query("select auth_user_id from public.club_members where id=? and auth_user_id is not null",
                (rs, row) -> rs.getObject(1, UUID.class), member.id()).stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Member has no linked Auth user"));
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        String password = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        auth.put().uri("/admin/users/{id}", authId).body(Map.of("password", password)).retrieve().toBodilessEntity();
        send(member, password);
    }

    private void link(MemberResponse member, UUID authId) {
        jdbc.update("update public.club_members set auth_user_id=? where id=? and auth_user_id is null", authId, member.id());
    }

    private void send(MemberResponse member, String password) {
        // Mật khẩu chỉ tồn tại trong bộ nhớ để gửi mail, không đưa vào báo cáo hoặc log.
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sender);
        message.setTo(member.email());
        message.setSubject("Thông tin tài khoản Project F");
        message.setText("Xin chào " + member.fullName() + ",\n\nTài khoản: " + member.email()
                + "\nMật khẩu: " + password + "\nĐăng nhập: " + loginUrl
                + "\n\nHãy giữ thông tin này riêng tư. Bạn có thể dùng chức năng quên mật khẩu khi cần.");
        mail.send(message);
    }

    private record AuthUser(@JsonProperty("id") UUID id) { }
}
