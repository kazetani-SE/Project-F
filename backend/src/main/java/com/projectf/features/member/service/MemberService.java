package com.projectf.features.member.service;

import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.MemberFilterRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MemberService {
    MemberResponse create(CreateMemberRequest request);
    MemberResponse get(UUID memberId);
    Page<MemberResponse> list(MemberFilterRequest filters, Pageable pageable);
    MemberResponse update(UUID memberId, UpdateMemberRequest request);
    MemberResponse updateStatus(UUID memberId, boolean active);
    MemberResponse requireActiveForAssignment(UUID memberId);
    Map<UUID, String> findNames(Collection<UUID> memberIds);
    Optional<MemberResponse> findByAuthUserId(UUID authUserId);
    Optional<MemberResponse> claimAccount(UUID authUserId, String verifiedEmail);
}
