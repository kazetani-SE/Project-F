package com.projectf.features.member.mapper;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.entity.ClubMember;
import org.springframework.stereotype.Component;
@Component
@SuppressWarnings("PMD.AtLeastOneConstructor") // Spring dùng constructor mặc định; constructor rỗng tường minh bị PMD coi là thừa.
public class MemberMapper {
 public MemberResponse toResponse(final ClubMember member) {
  return new MemberResponse(member.getId(),member.getStudentId(),member.getFullName(),member.getEmail(),member.getPhone(),
   member.getDepartment(),member.getClubRole(),member.getBatch(),member.getActive(),member.getCreatedAt(),member.getInactiveAt());
 }
 public ClubMember toEntity(final CreateMemberRequest request) {
  final ClubMember member=new ClubMember();
  member.setStudentId(request.studentId()); member.setFullName(request.fullName());
  member.setEmail(request.email()); member.setPhone(request.phone()); member.setDepartment(request.department());
  member.setClubRole(request.clubRole()); member.setBatch(request.batch()); return member;
 }
 public void update(final ClubMember member,final UpdateMemberRequest request) {
  member.setFullName(request.fullName()); member.setEmail(request.email()); member.setPhone(request.phone());
  member.setDepartment(request.department()); member.setClubRole(request.clubRole()); member.setBatch(request.batch());
  // null nghĩa là giữ nguyên trạng thái; service sau này đồng bộ thêm inactive_at.
  if (request.active() != null) {
   member.setActive(request.active());
  }
 }
}
