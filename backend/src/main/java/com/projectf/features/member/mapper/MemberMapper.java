package com.projectf.features.member.mapper;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.entity.ClubMember;
import org.springframework.stereotype.Component;
@Component
public class MemberMapper {
 public MemberResponse toResponse(ClubMember e) {
  return new MemberResponse(e.getId(),e.getStudentId(),e.getFullName(),e.getEmail(),e.getPhone(),
   e.getDepartment(),e.getClubRole(),e.getBatch(),e.getActive(),e.getCreatedAt(),e.getInactiveAt());
 }
 public ClubMember toEntity(CreateMemberRequest r) {
  ClubMember e=new ClubMember(); e.setStudentId(r.studentId()); e.setFullName(r.fullName());
  e.setEmail(r.email()); e.setPhone(r.phone()); e.setDepartment(r.department());
  e.setClubRole(r.clubRole()); e.setBatch(r.batch()); return e;
 }
 public void update(ClubMember e,UpdateMemberRequest r) {
  e.setFullName(r.fullName()); e.setEmail(r.email()); e.setPhone(r.phone());
  e.setDepartment(r.department()); e.setClubRole(r.clubRole()); e.setBatch(r.batch());
  // is_active do DB mặc định khi tạo; khi cập nhật sẽ do service xử lý mốc inactive_at.
 }
}
