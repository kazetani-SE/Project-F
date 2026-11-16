package com.projectf.features.member.repository;
import com.projectf.features.member.entity.ClubMember;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface ClubMemberRepository extends JpaRepository<ClubMember, UUID>, JpaSpecificationExecutor<ClubMember> {
    Optional<ClubMember> findByAuthUserId(UUID authUserId);
    boolean existsByStudentIdIgnoreCase(String studentId);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);

    @Query(value = "select projectf_private.find_confirmed_auth_user_id(:email)", nativeQuery = true)
    Optional<UUID> findConfirmedAuthUserIdByEmail(String email);

    @Transactional
    @Query(value = "select projectf_private.link_club_member_auth_if_absent(:memberId, :authUserId)",
            nativeQuery = true)
    int linkAuthUserIfAbsent(UUID memberId, UUID authUserId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select member from ClubMember member where member.id = :id")
    Optional<ClubMember> findByIdForUpdate(UUID id);

    @Transactional
    // Kiểm tra lại email, trạng thái xác nhận và hồ sơ chưa liên kết trong cùng câu lệnh cập nhật.
    @Query(value = "select projectf_private.claim_club_member_account(:authUserId, :email)", nativeQuery = true)
    int claimAccount(UUID authUserId, String email);
}
