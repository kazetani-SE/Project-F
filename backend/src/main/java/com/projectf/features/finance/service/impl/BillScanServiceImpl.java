package com.projectf.features.finance.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.GenerateContentConfig;
import com.projectf.features.finance.dto.response.BillScanResponse;
import com.projectf.features.finance.service.BillScanService;
import com.projectf.features.finance.service.support.GeminiGateway;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillScanServiceImpl implements BillScanService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
            "application/pdf");

    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024; // 10MB, khớp với cấu hình multipart

    private static final String PROMPT = """
            Đọc hóa đơn trong ảnh và trích thông tin. Số tiền là số nguyên VNĐ, không có dấu chấm/phẩy.
            Nếu không đọc được trường nào thì để null. Trả về DUY NHẤT 1 JSON hợp lệ (không markdown, không giải thích) theo mẫu:
            {"storeName":"","billDate":"yyyy-MM-dd","totalAmount":0,
             "items":[{"name":"","quantity":1,"unitPrice":0,"amount":0}]}
            """;

    private final GeminiGateway gemini;
    private final ObjectMapper objectMapper;

    @Override
    public BillScanResponse scan(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Chưa chọn ảnh hóa đơn.");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("File quá lớn, tối đa 10MB.");
        }

        String mimeType = normalizeMime(file.getContentType());
        if (mimeType == null || !ALLOWED_TYPES.contains(mimeType)) {
            throw new IllegalArgumentException(
                    "Chỉ hỗ trợ ảnh JPEG, PNG, WEBP, HEIC/HEIF hoặc PDF.");
        }

        log.info("Quét bill: mime='{}', size={} bytes", mimeType, file.getSize());

        GenerateContentConfig config = GenerateContentConfig.builder()
                .maxOutputTokens(4096)
                .build();

        try {
            String raw = gemini.generateWithImage(PROMPT, file.getBytes(), mimeType, config);
            return objectMapper.readValue(stripMarkdownCodeFence(raw), BillScanResponse.class);
        } catch (IOException e) {
            throw new IllegalStateException("Không đọc được hóa đơn: " + e.getMessage(), e);
        }
    }

    private String normalizeMime(String contentType) {
        if (contentType == null) {
            return null;
        }
        String mime = contentType.trim().toLowerCase();
        int semicolon = mime.indexOf(';');
        if (semicolon > 0) {
            mime = mime.substring(0, semicolon).trim();
        }
        return "image/jpg".equals(mime) ? "image/jpeg" : mime;
    }

    private String stripMarkdownCodeFence(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline > 0 && lastFence > firstNewline) {
                return trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return trimmed;
    }
}