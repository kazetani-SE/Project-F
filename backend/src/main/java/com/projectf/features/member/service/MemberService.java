package com.projectf.features.member.service;
import com.projectf.common.enums.Department;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;
/** Hợp đồng nghiệp vụ; Phase 0 chưa có implementation và chưa mở endpoint. */
public interface MemberService {
 MemberResponse create(CreateMemberRequest request);
 MemberResponse get(UUID memberId);
 /** Các bộ lọc có thể bỏ trống; implementation xử lý ở giai đoạn API. */
 Page<MemberResponse> list(Department department,String batch,Boolean active,Pageable pageable);
 MemberResponse update(UUID memberId,UpdateMemberRequest request);
}
