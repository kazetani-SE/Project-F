package com.projectf.features.storage.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.sesv2.SesV2Client;

@Configuration
public class AwsS3Config {
    private static final String ACCESS_KEY_PROP = "${aws.access-key-id:}";
    private static final String SECRET_KEY_PROP = "${aws.secret-access-key:}";
    private static final String TOKEN_PROP = "${aws.session-token:}";

    private AwsCredentialsProvider resolveCredentialsProvider(
            String accessKeyId,
            String secretAccessKey,
            String sessionToken
    ) {
        AwsCredentialsProvider provider;
        if (accessKeyId.isBlank() || secretAccessKey.isBlank()) {
            try (DefaultCredentialsProvider defaultProv = DefaultCredentialsProvider.create()) {
                defaultProv.resolveCredentials();
                provider = DefaultCredentialsProvider.create();
            } catch (Exception ex) {
                provider = StaticCredentialsProvider.create(
                        AwsBasicCredentials.create("LOCAL_MOCK_ACCESS_KEY", "LOCAL_MOCK_SECRET_KEY")
                );
            }
        } else if (sessionToken.isBlank()) {
            // Hỗ trợ tài khoản AWS thông thường (IAM User Access Key / Secret Key)
            provider = StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId, secretAccessKey)
            );
        } else {
            // Hỗ trợ AWS Academy Learner Lab (sử dụng Temporary Credentials có Session Token)
            provider = StaticCredentialsProvider.create(
                    AwsSessionCredentials.create(accessKeyId, secretAccessKey, sessionToken)
            );
        }
        return provider;
    }

    @Bean
    public S3Presigner s3Presigner(
            @Value("${aws.region:ap-southeast-1}") String region,
            @Value(ACCESS_KEY_PROP) String accessKeyId,
            @Value(SECRET_KEY_PROP) String secretAccessKey,
            @Value(TOKEN_PROP) String sessionToken
    ) {
        AwsCredentialsProvider provider = resolveCredentialsProvider(accessKeyId, secretAccessKey, sessionToken);
        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(provider)
                .build();
    }

    @Bean
    public S3Client s3Client(
            @Value("${aws.region:ap-southeast-1}") String region,
            @Value(ACCESS_KEY_PROP) String accessKeyId,
            @Value(SECRET_KEY_PROP) String secretAccessKey,
            @Value(TOKEN_PROP) String sessionToken
    ) {
        AwsCredentialsProvider provider = resolveCredentialsProvider(accessKeyId, secretAccessKey, sessionToken);
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(provider)
                .build();
    }

    @Bean
    public CognitoIdentityProviderClient cognitoClient(
            @Value("${aws.cognito.region:${aws.region:ap-southeast-1}}") String region,
            @Value(ACCESS_KEY_PROP) String accessKeyId,
            @Value(SECRET_KEY_PROP) String secretAccessKey,
            @Value(TOKEN_PROP) String sessionToken
    ) {
        AwsCredentialsProvider provider = resolveCredentialsProvider(accessKeyId, secretAccessKey, sessionToken);
        return CognitoIdentityProviderClient.builder()
                .region(Region.of(region))
                .credentialsProvider(provider)
                .build();
    }

    @Bean
    public SesV2Client sesV2Client(
            @Value("${aws.ses.region:${aws.region:ap-southeast-1}}") String region,
            @Value(ACCESS_KEY_PROP) String accessKeyId,
            @Value(SECRET_KEY_PROP) String secretAccessKey,
            @Value(TOKEN_PROP) String sessionToken
    ) {
        AwsCredentialsProvider provider = resolveCredentialsProvider(accessKeyId, secretAccessKey, sessionToken);
        return SesV2Client.builder()
                .region(Region.of(region))
                .credentialsProvider(provider)
                .build();
    }
}
