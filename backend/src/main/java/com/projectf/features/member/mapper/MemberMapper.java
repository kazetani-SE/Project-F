package com.projectf.features.member.mapper;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.entity.ClubMember;
import java.time.OffsetDateTime;
import java.util.Locale;
import org.springframework.stereotype.Component;
@Component
public class MemberMapper {
 public MemberResponse toResponse(ClubMember member) {
  return new MemberResponse(member.getId(),member.getStudentId(),member.getFullName(),member.getEmail(),member.getPhone(),
   member.getDepartment(),member.getClubRole(),member.getBatch(),member.getActive(),member.getCreatedAt(),member.getInactiveAt());
 }
 public ClubMember toEntity(CreateMemberRequest request) {
  ClubMember member=new ClubMember();
  member.setStudentId(request.studentId().toUpperCase(Locale.ROOT)); member.setFullName(request.fullName());
  member.setEmail(request.email().toLowerCase(Locale.ROOT)); member.setPhone(request.phone()); member.setDepartment(request.department());
  member.setClubRole(request.clubRole()); member.setBatch(request.batch()); return member;
 }
 public void update(ClubMember member,UpdateMemberRequest request) {
  member.setFullName(request.fullName()); member.setEmail(request.email().toLowerCase(Locale.ROOT)); member.setPhone(request.phone());
  member.setDepartment(request.department()); member.setClubRole(request.clubRole()); member.setBatch(request.batch());
  if (request.active() != null) {
   updateStatus(member, request.active());
  }
 }

 public void updateStatus(ClubMember member, boolean active) {
  member.setActive(active);
  if (active) {
   member.setInactiveAt(null);
  } else if (member.getInactiveAt() == null) {
   member.setInactiveAt(OffsetDateTime.now());
  }
 }
}
