package com.projectf.features.storage.service;

import com.projectf.common.security.AccessPolicy;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AttachmentAccess {
    private static final Pattern VERSION = Pattern.compile("[^?]+\\?versionId=([^&?#]+)");
    private static final String OWNER_QUERY = """
            select event_id from event_documents where file_url = ?
            union select event_id from event_media_assets where design_file_url = ?
            union select event_id from event_media_assets where preview_image_url = ?
            union select event_id from event_feedbacks where file_url = ?
            union select expense.event_id from expense_receipts receipt
                join expenses expense on expense.id = receipt.expense_id where receipt.image_url = ?
            """;
    private final ObjectProvider<JdbcTemplate> jdbc;
    private final AccessPolicy access;

    public AttachmentAccess(ObjectProvider<JdbcTemplate> jdbc, AccessPolicy access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    public void requireDownload(String reference) {
        if (access.isAdmin()) {
            return;
        }
        // A legacy mutable key could point to a newer upload for another event.
        if (!hasImmutableVersion(reference)) {
            throw AccessPolicy.forbidden();
        }
        List<UUID> owners = jdbc.getObject().queryForList(OWNER_QUERY, UUID.class,
                reference, reference, reference, reference, reference);
        if (owners.isEmpty()) {
            throw AccessPolicy.forbidden();
        }
        owners.forEach(access::requireEvent);
    }

    private static boolean hasImmutableVersion(String reference) {
        Matcher matcher = VERSION.matcher(reference);
        boolean immutable = false;
        try {
            if (matcher.matches()) {
                String version = URLDecoder.decode(matcher.group(1).replace("+", "%2B"), StandardCharsets.UTF_8);
                immutable = !version.isBlank() && !"null".equalsIgnoreCase(version.strip());
            }
        } catch (IllegalArgumentException ignored) {
            // Invalid percent escapes cannot name a version.
        }
        return immutable;
    }
}
