package com.projectf.features.knowledge.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectf.features.knowledge.dto.request.KnowledgeChatRequest.ChatTurnItem;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
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
    private static final String KEY_ROLE = "role";
    private static final String ROLE_USER = "user";
    private static final String ROLE_ASSISTANT = "assistant";
    private static final String ROLE_MODEL = "model";
    private static final int FAST_MAX_TOKENS = 2048;
    private static final int DEEP_MAX_TOKENS = 4096;
    private static final int MAX_ATTEMPTS = 2;
    private static final long RETRY_BACKOFF_MS = 350L;

    private final String activeProvider;
    private final String bedrockRegion;
    private final String accessKeyId;
    private final String secretAccessKey;
    private final String sessionToken;
    private final String geminiApiKey;
    private final String fallbackGemini;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Autowired
    public LlmGateway(
            @Value("${app.ai.provider:bedrock}") String activeProvider,
            @Value("${app.ai.bedrock.region:us-east-1}") String bedrockRegion,
            @Value("${aws.access-key-id:}") String accessKeyId,
            @Value("${aws.secret-access-key:}") String secretAccessKey,
            @Value("${aws.session-token:}") String sessionToken,
            @Value("${app.ai.gemini.api-key:}") String geminiApiKey,
            @Value("${app.ai.gemini.fast-model-id:gemini-3.5-flash-lite}") String fallbackGemini,
            ObjectMapper objectMapper
    ) {
        this.activeProvider = activeProvider;
        this.bedrockRegion = bedrockRegion;
        this.accessKeyId = accessKeyId;
        this.secretAccessKey = secretAccessKey;
        this.sessionToken = sessionToken;
        this.geminiApiKey = geminiApiKey;
        this.fallbackGemini = fallbackGemini;
        this.objectMapper = objectMapper;
        this.restClient = buildConfiguredRestClient();
    }

    public record LlmInvocationResult(
            String jsonContent,
            String actualModelUsed,
            String actualTier
    ) {
    }

    public Optional<String> invokeStructuredJson(
            AiModelDecision decision,
            String systemPrompt,
            String userPrompt
    ) {
        return invokeWithMetadata(decision, systemPrompt, userPrompt, Collections.emptyList())
                .map(LlmInvocationResult::jsonContent);
    }

    public Optional<LlmInvocationResult> invokeWithMetadata(
            AiModelDecision decision,
            String systemPrompt,
            String userPrompt,
            List<ChatTurnItem> history
    ) {
        int maxTokens = AiModelRouter.TIER_DEEP.equalsIgnoreCase(decision.tier())
                ? DEEP_MAX_TOKENS
                : FAST_MAX_TOKENS;
        List<ChatTurnItem> safeHistory = history == null ? Collections.emptyList() : history;
        Optional<LlmInvocationResult> output = Optional.empty();

        if (PROVIDER_GEMINI.equalsIgnoreCase(activeProvider) && !geminiApiKey.isBlank()) {
            output = invokeGeminiWithRetry(decision.modelId(), decision.tier(), systemPrompt, userPrompt, safeHistory, maxTokens);
        } else if (PROVIDER_BEDROCK.equalsIgnoreCase(activeProvider)) {
            output = invokeBedrockWithRetry(decision.modelId(), decision.tier(), systemPrompt, userPrompt, safeHistory, maxTokens);
            if (output.isEmpty() && !geminiApiKey.isBlank()) {
                output = invokeGeminiWithRetry(
                        fallbackGemini,
                        decision.tier(),
                        systemPrompt,
                        userPrompt,
                        safeHistory,
                        maxTokens
                );
            }
        }
        return output;
    }

    private Optional<LlmInvocationResult> invokeBedrockWithRetry(
            String modelId,
            String tier,
            String systemPrompt,
            String userPrompt,
            List<ChatTurnItem> history,
            int maxTokens
    ) {
        Optional<LlmInvocationResult> result = Optional.empty();
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            Optional<String> jsonOpt = callBedrock(modelId, systemPrompt, userPrompt, history, maxTokens);
            if (jsonOpt.isPresent()) {
                result = Optional.of(new LlmInvocationResult(jsonOpt.get(), modelId, tier));
                break;
            }
            if (attempt < MAX_ATTEMPTS) {
                sleepQuietly();
            }
        }
        return result;
    }

    private Optional<LlmInvocationResult> invokeGeminiWithRetry(
            String modelId,
            String tier,
            String systemPrompt,
            String userPrompt,
            List<ChatTurnItem> history,
            int maxTokens
    ) {
        Optional<LlmInvocationResult> result = Optional.empty();
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            Optional<String> jsonOpt = callGemini(modelId, systemPrompt, userPrompt, history, maxTokens);
            if (jsonOpt.isPresent()) {
                result = Optional.of(new LlmInvocationResult(jsonOpt.get(), modelId, tier));
                break;
            }
            if (attempt < MAX_ATTEMPTS) {
                sleepQuietly();
            }
        }
        return result;
    }

    private Optional<String> callBedrock(
            String modelId,
            String systemPrompt,
            String userPrompt,
            List<ChatTurnItem> history,
            int maxTokens
    ) {
        Optional<String> result = Optional.empty();
        Optional<AwsCredentialsProvider> credentialsOpt = resolveAwsCredentials();
        if (credentialsOpt.isPresent()) {
            try (BedrockRuntimeClient bedrockClient = BedrockRuntimeClient.builder()
                    .region(Region.of(bedrockRegion))
                    .credentialsProvider(credentialsOpt.get())
                    .build()) {

                List<Map<String, Object>> messages = buildBedrockMessages(history, userPrompt);
                Map<String, Object> payload = Map.of(
                        "anthropic_version", "bedrock-2023-05-31",
                        "max_tokens", maxTokens,
                        "temperature", 0.2,
                        "system", systemPrompt,
                        "messages", messages
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
                    LOG.info("AWS Bedrock không khả dụng trên môi trường hiện tại ({}), chuyển sang fallback.",
                            ex.getMessage());
                }
            }
        }
        return result;
    }

    private Optional<String> callGemini(
            String modelId,
            String systemPrompt,
            String userPrompt,
            List<ChatTurnItem> history,
            int maxTokens
    ) {
        Optional<String> result = Optional.empty();
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + modelId + ":generateContent?key=" + geminiApiKey;

            List<Map<String, Object>> contents = buildGeminiContents(history, userPrompt);
            Map<String, Object> body = Map.of(
                    "systemInstruction", Map.of(
                            "parts", List.of(Map.of(KEY_TEXT, systemPrompt))
                    ),
                    "contents", contents,
                    "generationConfig", Map.of(
                            "temperature", 0.2,
                            "maxOutputTokens", maxTokens,
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
                LOG.info("Gemini API không khả dụng ({}), chuyển sang fallback.", ex.getMessage());
            }
        }
        return result;
    }

    private List<Map<String, Object>> buildBedrockMessages(List<ChatTurnItem> history, String currentUserPrompt) {
        List<Map<String, Object>> messages = new ArrayList<>();
        String lastRole = "";
        for (ChatTurnItem turn : history) {
            if (turn != null && turn.content() != null && !turn.content().isBlank()) {
                String normalizedRole = ROLE_ASSISTANT.equalsIgnoreCase(turn.role()) ? ROLE_ASSISTANT : ROLE_USER;
                if (messages.isEmpty() && ROLE_ASSISTANT.equals(normalizedRole)) {
                    continue;
                }
                if (normalizedRole.equals(lastRole)) {
                    continue;
                }
                messages.add(Map.of(
                        KEY_ROLE, normalizedRole,
                        "content", List.of(Map.of("type", KEY_TEXT, KEY_TEXT, turn.content().trim()))
                ));
                lastRole = normalizedRole;
            }
        }
        if (ROLE_USER.equals(lastRole) && !messages.isEmpty()) {
            messages.remove(messages.size() - 1);
        }
        messages.add(Map.of(
                KEY_ROLE, ROLE_USER,
                "content", List.of(Map.of("type", KEY_TEXT, KEY_TEXT, currentUserPrompt))
        ));
        return messages;
    }

    private List<Map<String, Object>> buildGeminiContents(List<ChatTurnItem> history, String currentUserPrompt) {
        List<Map<String, Object>> contents = new ArrayList<>();
        String lastRole = "";
        for (ChatTurnItem turn : history) {
            if (turn != null && turn.content() != null && !turn.content().isBlank()) {
                String normalizedRole = ROLE_ASSISTANT.equalsIgnoreCase(turn.role()) ? ROLE_MODEL : ROLE_USER;
                if (contents.isEmpty() && ROLE_MODEL.equals(normalizedRole)) {
                    continue;
                }
                if (normalizedRole.equals(lastRole)) {
                    continue;
                }
                contents.add(Map.of(
                        KEY_ROLE, normalizedRole,
                        "parts", List.of(Map.of(KEY_TEXT, turn.content().trim()))
                ));
                lastRole = normalizedRole;
            }
        }
        if (ROLE_USER.equals(lastRole) && !contents.isEmpty()) {
            contents.remove(contents.size() - 1);
        }
        contents.add(Map.of(
                KEY_ROLE, ROLE_USER,
                "parts", List.of(Map.of(KEY_TEXT, currentUserPrompt))
        ));
        return contents;
    }

    private RestClient buildConfiguredRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(45));
        return RestClient.builder().requestFactory(factory).build();
    }

    private void sleepQuietly() {
        try {
            Thread.sleep(RETRY_BACKOFF_MS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
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
