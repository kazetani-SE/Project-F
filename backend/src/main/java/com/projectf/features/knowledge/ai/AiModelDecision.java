package com.projectf.features.knowledge.ai;

public record AiModelDecision(
        String tier,
        String modelId,
        String routingReason
) {
}
