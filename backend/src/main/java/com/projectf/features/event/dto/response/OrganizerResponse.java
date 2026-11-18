package com.projectf.features.event.dto.response;
import com.projectf.features.event.entity.EventRole;
import java.time.OffsetDateTime;
import java.util.UUID;
// 'id' giữ đúng tên trường JSON của API.
public record OrganizerResponse(UUID id, UUID eventId, UUID memberId, String memberName,
                                EventRole role, String assignedTasks, OffsetDateTime joinedAt) {}
