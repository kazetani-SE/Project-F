package com.projectf.features.member.mapper;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.entity.ClubMember;
import org.springframework.stereotype.Component;
@Component
public class MemberMapper {
 public MemberResponse toResponse(ClubMember member) {
  return new MemberResponse(member.getId(),member.getStudentId(),member.getFullName(),member.getEmail(),member.getPhone(),
   member.getDepartment(),member.getClubRole(),member.getBatch(),member.getActive(),member.getCreatedAt(),member.getInactiveAt());
 }
 public ClubMember toEntity(CreateMemberRequest request) {
  ClubMember member=new ClubMember();
  member.setStudentId(request.studentId()); member.setFullName(request.fullName());
  member.setEmail(request.email()); member.setPhone(request.phone()); member.setDepartment(request.department());
  member.setClubRole(request.clubRole()); member.setBatch(request.batch()); return member;
 }
 public void update(ClubMember member,UpdateMemberRequest request) {
  member.setFullName(request.fullName()); member.setEmail(request.email()); member.setPhone(request.phone());
  member.setDepartment(request.department()); member.setClubRole(request.clubRole()); member.setBatch(request.batch());
  // null nghĩa là giữ nguyên trạng thái; service sau này đồng bộ thêm inactive_at.
  if (request.active() != null) {
   member.setActive(request.active());
  }
 }
}
