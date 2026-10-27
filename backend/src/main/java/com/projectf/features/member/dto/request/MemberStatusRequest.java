package com.projectf.features.member.dto.request;
import jakarta.validation.constraints.NotNull;
public record MemberStatusRequest(@NotNull Boolean isActive) { }
