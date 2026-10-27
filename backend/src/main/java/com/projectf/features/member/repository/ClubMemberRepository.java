package com.projectf.features.member.repository;
import com.projectf.features.member.entity.ClubMember;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ClubMemberRepository extends JpaRepository<ClubMember,UUID> {}
