package com.projectf.features.member.service.impl;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.enums.Department;
import com.projectf.common.exception.ApiException;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.mapper.MemberMapper;
import com.projectf.features.member.repository.ClubMemberRepository;
import com.projectf.features.member.service.MemberService;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional(readOnly = true)
public class MemberServiceImpl implements MemberService {
    private final ClubMemberRepository members;
    private final MemberMapper mapper;

    public MemberServiceImpl(ClubMemberRepository members, MemberMapper mapper) {
        this.members = members;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public MemberResponse create(CreateMemberRequest request) {
        ClubMember member = mapper.toEntity(request);
        if (members.existsByStudentIdIgnoreCase(member.getStudentId())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", "Student ID already exists");
        }
        if (members.existsByEmailIgnoreCase(member.getEmail())) {
            throw duplicateEmail(null);
        }
        try {
            return mapper.toResponse(members.saveAndFlush(member));
        } catch (DataIntegrityViolationException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", "Student ID or email already exists",
                    exception);
        }
    }

    @Override
    public MemberResponse get(UUID memberId) {
        return mapper.toResponse(members.findById(memberId).orElseThrow(MemberServiceImpl::notFound));
    }

    @Override
    public Page<MemberResponse> list(String keyword, Department department, ClubRole role, String batch,
                                     Boolean active, Pageable pageable) {
        return members.findAll((member, query, criteria) -> {
            List<Predicate> filters = new ArrayList<>();
            if (StringUtils.hasText(keyword)) {
                // Giữ %, _ và ! trong từ khóa là ký tự nhập liệu thay vì mẫu tìm kiếm SQL.
                String pattern = "%" + keyword.strip().toLowerCase(Locale.ROOT)
                        .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
                filters.add(criteria.or(
                        criteria.like(criteria.lower(member.get("fullName")), pattern, '!'),
                        criteria.like(criteria.lower(member.get("studentId")), pattern, '!'),
                        criteria.like(criteria.lower(member.get("email")), pattern, '!')));
            }
            if (department != null) {
                filters.add(criteria.equal(member.get("department"), department));
            }
            if (role != null) {
                filters.add(criteria.equal(member.get("clubRole"), role));
            }
            if (StringUtils.hasText(batch)) {
                filters.add(criteria.equal(criteria.lower(member.get("batch")), batch.strip().toLowerCase(Locale.ROOT)));
            }
            if (active != null) {
                filters.add(criteria.equal(member.get("active"), active));
            }
            return criteria.and(filters.toArray(Predicate[]::new));
        }, pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional
    public MemberResponse update(UUID memberId, UpdateMemberRequest request) {
        ClubMember member = getForUpdate(memberId);
        if (members.existsByEmailIgnoreCaseAndIdNot(request.email(), memberId)) {
            throw duplicateEmail(null);
        }
        mapper.update(member, request);
        try {
            return mapper.toResponse(members.saveAndFlush(member));
        } catch (DataIntegrityViolationException exception) {
            throw duplicateEmail(exception);
        }
    }

    @Override
    @Transactional
    public MemberResponse updateStatus(UUID memberId, boolean active) {
        ClubMember member = getForUpdate(memberId);
        mapper.updateStatus(member, active);
        return mapper.toResponse(members.saveAndFlush(member));
    }

    @Override
    @Transactional
    public MemberResponse requireActiveForAssignment(UUID memberId) {
        ClubMember member = getForUpdate(memberId);
        if (!Boolean.TRUE.equals(member.getActive())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INACTIVE_MEMBER", "Only active members can join an event");
        }
        return mapper.toResponse(member);
    }

    @Override
    public Map<UUID, String> findNames(Collection<UUID> memberIds) {
        return members.findAllById(memberIds).stream()
                .collect(Collectors.toMap(ClubMember::getId, ClubMember::getFullName));
    }

    private ClubMember getForUpdate(UUID memberId) {
        return members.findByIdForUpdate(memberId).orElseThrow(MemberServiceImpl::notFound);
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", "Member not found");
    }

    private static ApiException duplicateEmail(Throwable cause) {
        return new ApiException(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", "Email already exists", cause);
    }
}
