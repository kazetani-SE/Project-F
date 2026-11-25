package com.projectf.features.member.service;

import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.repository.ClubMemberRepository;
import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminCreateUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminCreateUserResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminGetUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminGetUserResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminSetUserPasswordRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.MessageActionType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserNotFoundException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UsernameExistsException;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

@Service
public class MemberCredentialService {
    public static final String EMAIL_FAILED = "EMAIL_FAILED";
    private static final String UTF8 = "UTF-8";
    private static final String SUBJECT = "Thông tin tài khoản Project F";
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SYMBOLS = "!@#$%^&*()-_=+";
    private static final String ALL_CHARS = UPPER + LOWER + DIGITS + SYMBOLS;

    private final ClubMemberRepository members;
    private final CognitoIdentityProviderClient cognito;
    private final SesV2Client ses;
    private final boolean sesEnabled;
    private final String configurationSet;
    private final String userPoolId;
    private final JavaMailSender mail;
    private final String sender;
    private final String loginUrl;
    private final SecureRandom random = new SecureRandom();

    public MemberCredentialService(
            ClubMemberRepository members,
            CognitoIdentityProviderClient cognito,
            SesV2Client ses,
            JavaMailSender mail,
            @Value("${aws.cognito.user-pool-id:${AWS_COGNITO_USER_POOL_ID:}}") String userPoolId,
            @Value("${aws.ses.enabled:${AWS_SES_ENABLED:true}}") boolean sesEnabled,
            @Value("${aws.ses.configuration-set:${AWS_SES_CONFIGURATION_SET:}}") String configurationSet,
            @Value("${APP_MAIL_FROM:}") String sender,
            @Value("${APP_LOGIN_URL:http://localhost:5173/login}") String loginUrl
    ) {
        this.members = members;
        this.cognito = cognito;
        this.ses = ses;
        this.sesEnabled = sesEnabled;
        this.configurationSet = configurationSet == null ? "" : configurationSet.strip();
        this.userPoolId = userPoolId == null ? "" : userPoolId.strip();
        this.mail = mail;
        this.sender = sender == null ? "" : sender.strip();
        this.loginUrl = loginUrl;
    }

    public String provision(MemberResponse member) {
        requireUserPoolId();
        String email = member.email().strip().toLowerCase(Locale.ROOT);
        UUID linkedAuthId = members.findById(member.id()).map(ClubMember::getAuthUserId).orElse(null);
        UUID existingInDb = members.findConfirmedAuthUserIdByEmail(email).orElse(null);
        String result;
        if (linkedAuthId != null || existingInDb != null) {
            UUID targetId = linkedAuthId != null ? linkedAuthId : existingInDb;
            link(member, targetId);
            result = "AUTH_EXISTS";
        } else {
            String password = generatePassword();
            UUID cognitoId = findExistingCognitoUserSub(email)
                    .map(existingSub -> {
                        setPermanentPassword(email, password);
                        return existingSub;
                    })
                    .orElseGet(() -> createCognitoUser(email, member.fullName(), password));
            try {
                send(member, password);
                link(member, cognitoId);
                result = "CREATED";
            } catch (MailException exception) {
                // Không link auth_user_id vào club_members khi gửi mail thất bại để lần bấm cấp tài khoản tiếp theo vẫn gửi lại được mail mới.
                result = EMAIL_FAILED;
            }
        }
        return result;
    }

    public void resend(MemberResponse member) {
        requireUserPoolId();
        String email = member.email().strip().toLowerCase(Locale.ROOT);
        String password = generatePassword();
        UUID authId = members.findById(member.id()).map(ClubMember::getAuthUserId)
                .or(() -> findExistingCognitoUserSub(email))
                .map(existingId -> {
                    setPermanentPassword(email, password);
                    return existingId;
                })
                .orElseGet(() -> createCognitoUser(email, member.fullName(), password));
        send(member, password);
        link(member, authId);
    }

    private void setPermanentPassword(String email, String password) {
        cognito.adminSetUserPassword(AdminSetUserPasswordRequest.builder()
                .userPoolId(userPoolId)
                .username(email)
                .password(password)
                .permanent(true)
                .build());
    }

    private UUID createCognitoUser(String email, String fullName, String password) {
        UUID userId;
        try {
            AdminCreateUserResponse created = cognito.adminCreateUser(AdminCreateUserRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .temporaryPassword(password)
                    .messageAction(MessageActionType.SUPPRESS)
                    .userAttributes(
                            AttributeType.builder().name("email").value(email).build(),
                            AttributeType.builder().name("email_verified").value("true").build(),
                            AttributeType.builder().name("name").value(fullName == null ? email : fullName).build()
                    )
                    .build());
            cognito.adminSetUserPassword(AdminSetUserPasswordRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .password(password)
                    .permanent(true)
                    .build());
            userId = extractSub(created.user());
        } catch (UsernameExistsException exception) {
            userId = findExistingCognitoUserSub(email)
                    .orElseThrow(() -> new IllegalStateException("Cognito user exists but sub could not be resolved", exception));
        }
        if (userId == null) {
            throw new IllegalStateException("Auth user was not created");
        }
        return userId;
    }

    private java.util.Optional<UUID> findExistingCognitoUserSub(String email) {
        UUID found = null;
        try {
            AdminGetUserResponse user = cognito.adminGetUser(AdminGetUserRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .build());
            for (AttributeType attr : user.userAttributes()) {
                if ("sub".equals(attr.name()) && attr.value() != null) {
                    found = UUID.fromString(attr.value());
                    break;
                }
            }
        } catch (UserNotFoundException ignored) {
            ListUsersResponse listed = cognito.listUsers(ListUsersRequest.builder()
                    .userPoolId(userPoolId)
                    .filter("email = \"" + email.replace("\"", "") + "\"")
                    .limit(1)
                    .build());
            List<UserType> users = listed.users();
            if (users != null && !users.isEmpty()) {
                found = extractSub(users.get(0));
            }
        }
        return java.util.Optional.ofNullable(found);
    }

    private static UUID extractSub(UserType user) {
        UUID result = null;
        if (user != null && user.hasAttributes()) {
            for (AttributeType attr : user.attributes()) {
                if ("sub".equals(attr.name()) && attr.value() != null) {
                    result = UUID.fromString(attr.value());
                    break;
                }
            }
        }
        return result;
    }

    private void requireUserPoolId() {
        if (userPoolId.isBlank()) {
            throw new IllegalStateException("Missing AWS_COGNITO_USER_POOL_ID configuration");
        }
    }

    private void link(MemberResponse member, UUID authId) {
        if (members.linkAuthUserIfAbsent(member.id(), authId) == 0) {
            UUID linked = members.findById(member.id()).map(ClubMember::getAuthUserId).orElse(null);
            if (!authId.equals(linked)) {
                throw new IllegalStateException("Member is linked to another Auth user");
            }
        }
    }

    private String generatePassword() {
        char[] chars = new char[20];
        chars[0] = UPPER.charAt(random.nextInt(UPPER.length()));
        chars[1] = LOWER.charAt(random.nextInt(LOWER.length()));
        chars[2] = DIGITS.charAt(random.nextInt(DIGITS.length()));
        chars[3] = SYMBOLS.charAt(random.nextInt(SYMBOLS.length()));
        for (int i = 4; i < chars.length; i++) {
            chars[i] = ALL_CHARS.charAt(random.nextInt(ALL_CHARS.length()));
        }
        for (int i = chars.length - 1; i > 0; i--) {
            int swapIdx = random.nextInt(i + 1);
            char temp = chars[i];
            chars[i] = chars[swapIdx];
            chars[swapIdx] = temp;
        }
        return new String(chars);
    }

    private void send(MemberResponse member, String password) {
        String textBody = "Xin chào " + member.fullName() + ",\n\nTài khoản: " + member.email()
                + "\nMật khẩu: " + password + "\nĐăng nhập: " + loginUrl
                + "\n\nHãy giữ thông tin này riêng tư. Bạn có thể dùng chức năng quên mật khẩu khi cần.";
        if (sesEnabled) {
            sendViaAwsSes(member, password, textBody);
        } else {
            sendViaSmtp(member.email(), textBody);
        }
    }

    private void sendViaAwsSes(MemberResponse member, String password, String textBody) {
        if (sender.isBlank()) {
            throw new MailSendException("Missing APP_MAIL_FROM configuration for Amazon SES");
        }
        String htmlBody = "<div style=\"font-family:sans-serif;line-height:1.6;color:#1e293b\">"
                + "<h2>Thông tin tài khoản Project F</h2>"
                + "<p>Xin chào <strong>" + escapeHtml(member.fullName()) + "</strong>,</p>"
                + "<p>Tài khoản câu lạc bộ của bạn đã được khởi tạo trên hệ thống Project F:</p>"
                + "<ul>"
                + "<li><strong>Email đăng nhập:</strong> " + escapeHtml(member.email()) + "</li>"
                + "<li><strong>Mật khẩu:</strong> <code>" + escapeHtml(password) + "</code></li>"
                + "</ul>"
                + "<p><a href=\"" + escapeHtml(loginUrl) + "\" style=\"display:inline-block;padding:10px 18px;"
                + "background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px\">Đăng nhập ngay</a></p>"
                + "<p style=\"font-size:13px;color:#64748b\">Hãy giữ thông tin này riêng tư. "
                + "Bạn có thể dùng chức năng quên mật khẩu khi cần.</p></div>";
        try {
            SendEmailRequest.Builder request = SendEmailRequest.builder()
                    .fromEmailAddress(sender)
                    .destination(Destination.builder().toAddresses(member.email().strip()).build())
                    .content(EmailContent.builder()
                            .simple(Message.builder()
                                    .subject(Content.builder().data(SUBJECT).charset(UTF8).build())
                                    .body(Body.builder()
                                            .text(Content.builder().data(textBody).charset(UTF8).build())
                                            .html(Content.builder().data(htmlBody).charset(UTF8).build())
                                            .build())
                                    .build())
                            .build());
            if (!configurationSet.isBlank()) {
                request.configurationSetName(configurationSet);
            }
            ses.sendEmail(request.build());
        } catch (SdkException exception) {
            throw new MailSendException("Failed to send account email via Amazon SES", exception);
        }
    }

    private void sendViaSmtp(String recipient, String textBody) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sender);
        message.setTo(recipient);
        message.setSubject(SUBJECT);
        message.setText(textBody);
        mail.send(message);
    }

    private static String escapeHtml(String value) {
        String safe;
        if (value == null) {
            safe = "";
        } else {
            safe = value.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;");
        }
        return safe;
    }
}
