package com.projectf.features.member.repository;

import com.projectf.features.member.entity.ClubMember;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ClubMemberRepository extends JpaRepository<ClubMember, UUID>, JpaSpecificationExecutor<ClubMember> {
    Optional<ClubMember> findByAuthUserId(UUID authUserId);
    @Modifying
    @Transactional
    @Query("update ClubMember m set m.authUserId = :authId where lower(m.email) = lower(:email) and m.authUserId is null and m.isActive = true")
    int linkActiveMember(@Param("authId") UUID authId, @Param("email") String email);
}

