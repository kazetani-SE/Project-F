package com.projectf.features.member.service;
import com.projectf.common.response.PageResponse;
import com.projectf.features.member.dto.request.MemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.entity.ClubMember;
import java.util.UUID;
public interface MemberService {
    PageResponse<MemberResponse> list(String department, String role, String batch, Boolean active, String keyword, int page, int size);
    MemberResponse get(UUID id);
    MemberResponse create(MemberRequest request);
    MemberResponse update(UUID id, MemberRequest request);
    MemberResponse status(UUID id, boolean active);
    ClubMember requireActive(UUID id);
}
