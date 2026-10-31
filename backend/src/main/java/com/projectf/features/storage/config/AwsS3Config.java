package com.projectf.features.storage.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class AwsS3Config {

    @Bean
    public S3Presigner s3Presigner(
            @Value("${aws.region:ap-southeast-1}") String region,
            @Value("${aws.access-key-id:}") String accessKeyId,
            @Value("${aws.secret-access-key:}") String secretAccessKey
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
        } else {
            provider = StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId, secretAccessKey)
            );
        }

        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(provider)
                .build();
    }
}
