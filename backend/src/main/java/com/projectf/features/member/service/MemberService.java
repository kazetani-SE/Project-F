package com.projectf.features.member.service;
import com.projectf.common.enums.ClubRole;
import com.projectf.common.enums.Department;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;
public interface MemberService {
 MemberResponse create(CreateMemberRequest request);
 MemberResponse get(UUID memberId);
 Page<MemberResponse> list(String keyword, Department department, ClubRole role, String batch, Boolean active,
                           Pageable pageable);
 MemberResponse update(UUID memberId,UpdateMemberRequest request);
 MemberResponse updateStatus(UUID memberId, boolean active);
 MemberResponse requireActiveForAssignment(UUID memberId);
 Map<UUID, String> findNames(Collection<UUID> memberIds);
}
