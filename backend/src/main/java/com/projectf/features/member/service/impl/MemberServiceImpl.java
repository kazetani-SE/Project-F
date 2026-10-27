package com.projectf.features.member.service.impl;

import com.projectf.common.response.PageResponse;
import com.projectf.common.security.AccessService;
import com.projectf.features.member.dto.request.MemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.mapper.MemberMapper;
import com.projectf.features.member.repository.ClubMemberRepository;
import com.projectf.features.member.service.MemberService;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberServiceImpl implements MemberService {
    private final ClubMemberRepository members;
    private final MemberMapper mapper;
    private final AccessService access;
    private final EntityManager entityManager;
    public MemberServiceImpl(final ClubMemberRepository members, final MemberMapper mapper,
            final AccessService access, final EntityManager entityManager) {
        this.members = members; this.mapper = mapper; this.access = access;
        this.entityManager = entityManager;
    }
    @Override
    public PageResponse<MemberResponse> list(final String department, final String role, final String batch,
            final Boolean active, final String keyword, final int page, final int size) {
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("VALIDATION_FAILED");
        Specification<ClubMember> spec = (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (department != null && !department.isBlank()) predicates.add(cb.equal(root.get("department").as(String.class), department));
            if (role != null && !role.isBlank()) predicates.add(cb.equal(root.get("clubRole").as(String.class), role));
            if (batch != null && !batch.isBlank()) predicates.add(cb.equal(root.get("batch"), batch));
            if (active != null) predicates.add(cb.equal(root.get("isActive"), active));
            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("fullName")), pattern), cb.like(cb.lower(root.get("studentId")), pattern), cb.like(cb.lower(root.get("email")), pattern)));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        var result = members.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.of(result.getContent().stream().map(mapper::toResponse).toList(), page, size, result.getTotalElements());
    }
    @Override
    public MemberResponse get(final UUID id) { return mapper.toResponse(find(id)); }
    @Override
    public ClubMember requireActive(final UUID id) {
        ClubMember member = find(id);
        if (!Boolean.TRUE.equals(member.getIsActive())) throw new IllegalArgumentException("VALIDATION_FAILED");
        return member;
    }
    @Override
    @Transactional public MemberResponse create(final MemberRequest request) {
        access.requireClubAdmin();
        if (blank(request.studentId()) || blank(request.fullName()) || blank(request.email()) || blank(request.batch())) throw new IllegalArgumentException("VALIDATION_FAILED");
        ClubMember member = new ClubMember(); apply(member, request);
        members.saveAndFlush(member);
        entityManager.refresh(member);
        return mapper.toResponse(member);
    }
    @Override
    @Transactional public MemberResponse update(final UUID id, final MemberRequest request) {
        access.requireClubAdmin(); ClubMember member = find(id); apply(member, request);
        return mapper.toResponse(members.saveAndFlush(member));
    }
    @Override
    @Transactional public MemberResponse status(final UUID id, final boolean active) {
        access.requireClubAdmin(); ClubMember member = find(id); member.setIsActive(active); member.setInactiveAt(active ? null : Instant.now());
        return mapper.toResponse(members.saveAndFlush(member));
    }
    private ClubMember find(final UUID id) { return members.findById(id).orElseThrow(() -> new NoSuchElementException("club_members")); }
    private boolean blank(final String value) { return value == null || value.isBlank(); }
    private void apply(final ClubMember member, final MemberRequest r) {
        if (r.studentId() != null) member.setStudentId(r.studentId());
        if (r.fullName() != null) member.setFullName(r.fullName());
        if (r.email() != null) member.setEmail(r.email());
        if (r.phone() != null) member.setPhone(r.phone());
        if (r.department() != null) member.setDepartment(r.department());
        if (r.clubRole() != null) member.setClubRole(r.clubRole());
        if (r.batch() != null) member.setBatch(r.batch());
        if (r.isActive() != null) member.setIsActive(r.isActive());
        if (r.inactiveAt() != null) member.setInactiveAt(r.inactiveAt());
    }
}
