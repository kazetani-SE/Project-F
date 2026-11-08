package com.projectf.features.member.repository;
import com.projectf.features.member.entity.ClubMember;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface ClubMemberRepository extends JpaRepository<ClubMember, UUID>, JpaSpecificationExecutor<ClubMember> {
    Optional<ClubMember> findByAuthUserId(UUID authUserId);
    boolean existsByStudentIdIgnoreCase(String studentId);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select member from ClubMember member where member.id = :id")
    Optional<ClubMember> findByIdForUpdate(UUID id);

    @Transactional
    @Modifying
    // Kiểm tra lại email, trạng thái xác nhận và hồ sơ chưa liên kết trong cùng câu lệnh cập nhật.
    @Query(value = """
            update public.club_members member set auth_user_id = :authUserId
            where lower(member.email) = lower(:email) and member.is_active and member.auth_user_id is null
                and exists (select 1 from auth.users auth_user where auth_user.id = :authUserId
                    and lower(auth_user.email) = lower(:email) and auth_user.email_confirmed_at is not null)
            """, nativeQuery = true)
    int claimAccount(UUID authUserId, String email);
}
