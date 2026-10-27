package com.projectf.features.member.service;
import com.projectf.features.member.dto.request.*;
import com.projectf.features.member.dto.response.MemberResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;
/** Hợp đồng nghiệp vụ; Phase 0 chưa có implementation và chưa mở endpoint. */
public interface MemberService {
 MemberResponse create(CreateMemberRequest request);
 MemberResponse get(UUID id);
 Page<MemberResponse> list(Pageable pageable);
 MemberResponse update(UUID id,UpdateMemberRequest request);
}
