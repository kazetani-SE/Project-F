package com.projectf.features.knowledge.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

@Component
public class LlmGateway {

    private static final Logger LOG = LoggerFactory.getLogger(LlmGateway.class);
    private static final String PROVIDER_BEDROCK = "bedrock";
    private static final String PROVIDER_GEMINI = "gemini";
    private static final String KEY_TEXT = "text";

    private final String activeProvider;
    private final String bedrockRegion;
    private final String accessKeyId;
    private final String secretAccessKey;
    private final String sessionToken;
    private final String geminiApiKey;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public LlmGateway(
            @Value("${app.ai.provider:bedrock}") String activeProvider,
            @Value("${app.ai.bedrock.region:us-east-1}") String bedrockRegion,
            @Value("${aws.access-key-id:}") String accessKeyId,
            @Value("${aws.secret-access-key:}") String secretAccessKey,
            @Value("${aws.session-token:}") String sessionToken,
            @Value("${app.ai.gemini.api-key:}") String geminiApiKey,
            ObjectMapper objectMapper
    ) {
        this.activeProvider = activeProvider;
        this.bedrockRegion = bedrockRegion;
        this.accessKeyId = accessKeyId;
        this.secretAccessKey = secretAccessKey;
        this.sessionToken = sessionToken;
        this.geminiApiKey = geminiApiKey;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public Optional<String> invokeStructuredJson(
            AiModelDecision decision,
            String systemPrompt,
            String userPrompt
    ) {
        Optional<String> output = Optional.empty();
        if (PROVIDER_GEMINI.equalsIgnoreCase(activeProvider) && !geminiApiKey.isBlank()) {
            output = callGemini(decision.modelId(), systemPrompt, userPrompt);
        } else if (PROVIDER_BEDROCK.equalsIgnoreCase(activeProvider)) {
            output = callBedrock(decision.modelId(), systemPrompt, userPrompt);
            if (output.isEmpty() && !geminiApiKey.isBlank()) {
                output = callGemini("gemini-2.5-flash", systemPrompt, userPrompt);
            }
        }
        return output;
    }

    private Optional<String> callBedrock(String modelId, String systemPrompt, String userPrompt) {
        Optional<String> result = Optional.empty();
        Optional<AwsCredentialsProvider> credentialsOpt = resolveAwsCredentials();
        if (credentialsOpt.isPresent()) {
            try (BedrockRuntimeClient bedrockClient = BedrockRuntimeClient.builder()
                    .region(Region.of(bedrockRegion))
                    .credentialsProvider(credentialsOpt.get())
                    .build()) {

                Map<String, Object> payload = Map.of(
                        "anthropic_version", "bedrock-2023-05-31",
                        "max_tokens", 2048,
                        "temperature", 0.2,
                        "system", systemPrompt,
                        "messages", List.of(
                                Map.of(
                                        "role", "user",
                                        "content", List.of(Map.of("type", KEY_TEXT, KEY_TEXT, userPrompt))
                                )
                        )
                );

                String payloadJson = objectMapper.writeValueAsString(payload);
                InvokeModelRequest request = InvokeModelRequest.builder()
                        .modelId(modelId)
                        .contentType(MediaType.APPLICATION_JSON_VALUE)
                        .accept(MediaType.APPLICATION_JSON_VALUE)
                        .body(SdkBytes.fromUtf8String(payloadJson))
                        .build();

                InvokeModelResponse response = bedrockClient.invokeModel(request);
                String responseBody = response.body().asUtf8String();
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode textNode = root.at("/content/0/text");
                if (!textNode.isMissingNode() && !textNode.isNull()) {
                    result = Optional.ofNullable(extractCleanJson(textNode.asText()));
                }
            } catch (Exception ex) {
                if (LOG.isInfoEnabled()) {
                    LOG.info("AWS Bedrock không khả dụng trên môi trường hiện tại ({}), chuyển sang Smart Fallback.",
                            ex.getMessage());
                }
            }
        }
        return result;
    }

    private Optional<String> callGemini(String modelId, String systemPrompt, String userPrompt) {
        Optional<String> result = Optional.empty();
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + modelId + ":generateContent?key=" + geminiApiKey;

            Map<String, Object> body = Map.of(
                    "systemInstruction", Map.of(
                            "parts", List.of(Map.of(KEY_TEXT, systemPrompt))
                    ),
                    "contents", List.of(
                            Map.of(
                                    "role", "user",
                                    "parts", List.of(Map.of(KEY_TEXT, userPrompt))
                            )
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.2,
                            "responseMimeType", "application/json"
                    )
            );

            String rawBody = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            if (rawBody != null && !rawBody.isBlank()) {
                JsonNode root = objectMapper.readTree(rawBody);
                JsonNode textNode = root.at("/candidates/0/content/parts/0/text");
                if (!textNode.isMissingNode() && !textNode.isNull()) {
                    result = Optional.ofNullable(extractCleanJson(textNode.asText()));
                }
            }
        } catch (Exception ex) {
            if (LOG.isInfoEnabled()) {
                LOG.info("Gemini API không khả dụng ({}), chuyển sang Smart Fallback.", ex.getMessage());
            }
        }
        return result;
    }

    private Optional<AwsCredentialsProvider> resolveAwsCredentials() {
        Optional<AwsCredentialsProvider> providerOpt = Optional.empty();
        if (accessKeyId.isBlank() || secretAccessKey.isBlank()) {
            try (DefaultCredentialsProvider defaultProv = DefaultCredentialsProvider.create()) {
                defaultProv.resolveCredentials();
                providerOpt = Optional.of(DefaultCredentialsProvider.create());
            } catch (Exception ex) {
                if (LOG.isDebugEnabled()) {
                    LOG.debug("Chưa cấu hình AWS Credentials ở môi trường local: {}", ex.getMessage());
                }
            }
        } else if (sessionToken.isBlank()) {
            providerOpt = Optional.of(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId, secretAccessKey)
            ));
        } else {
            providerOpt = Optional.of(StaticCredentialsProvider.create(
                    AwsSessionCredentials.create(accessKeyId, secretAccessKey, sessionToken)
            ));
        }
        return providerOpt;
    }

    private String extractCleanJson(String rawText) {
        String cleaned = null;
        if (rawText != null) {
            String trimmed = rawText.trim();
            int firstBrace = trimmed.indexOf('{');
            int lastBrace = trimmed.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) {
                cleaned = trimmed.substring(firstBrace, lastBrace + 1);
            } else {
                cleaned = trimmed;
            }
        }
        return cleaned;
    }
}
