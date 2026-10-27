package com.projectf.features.member.mapper;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.entity.ClubMember;
import org.springframework.stereotype.Component;
@Component
public class MemberMapper {
    public MemberResponse toResponse(final ClubMember m) {
        return new MemberResponse(m.getId(), m.getStudentId(), m.getFullName(), m.getEmail(), m.getPhone(),
                m.getDepartment(), m.getClubRole(), m.getBatch(), m.getIsActive(), m.getCreatedAt(), m.getInactiveAt(), m.getAuthUserId());
    }
}
