package com.projectf.features.finance.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.GenerateContentConfig;
import com.projectf.features.finance.dto.response.BillScanResponse;
import com.projectf.features.finance.service.BillScanService;
import com.projectf.features.finance.service.support.FinanceGeminiGateway;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillScanServiceImpl implements BillScanService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024; // khớp cấu hình multipart
    private static final Pattern ISO_DATE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    private static final String PROMPT = """
            Bạn đọc hóa đơn, báo giá hoặc chứng từ mua hàng tại Việt Nam trong tệp đính kèm.
            Trả về DUY NHẤT 1 JSON hợp lệ (không markdown, không giải thích) theo mẫu:
            {"storeName":null,"billDate":null,"receiptCode":null,"itemName":null,"quantity":1,"unitPrice":0,"totalAmount":0,"notes":null}

            Quy tắc:
            - storeName: tên đơn vị BÁN (cửa hàng, công ty), không phải người mua.
            - billDate: ngày trên chứng từ, định dạng yyyy-MM-dd. Không rõ thì null, không tự đoán.
            - receiptCode: số/mã hóa đơn hoặc báo giá (Số HĐ, Invoice No, mã bill). Không có thì null.
            - itemName: CHỈ lấy tên gọi chính, ngắn gọn của dòng hàng ĐẦU TIÊN (VD: "TÚI VẢI CANVAS"). Tuyệt đối KHÔNG gộp thông số kỹ thuật, chất liệu, kích thước, màu sắc hay quy cách in ấn vào đây.
            - notes: trích xuất ngắn gọn phần mô tả/quy cách đi kèm của mặt hàng đầu tiên (chất liệu, kích thước, nội dung in ấn...) và ghi chú đáng chú ý (như VAT 8%, gồm phí vận chuyển/thiết kế, hoặc danh sách ngắn các món khác nếu chứng từ có nhiều dòng). Không có thì null.
            - quantity, unitPrice: số lượng và đơn giá của dòng hàng ĐẦU TIÊN.
            - totalAmount: tổng thanh toán cuối cùng của cả chứng từ (đã gồm VAT, trừ giảm giá).
            - Tiền là số nguyên VNĐ, không dấu chấm/phẩy, không ký hiệu (1.250.000đ -> 1250000).
            - Không đọc được trường nào thì để null (quantity mặc định 1, tiền mặc định 0).
            """;

    private final FinanceGeminiGateway gemini;
    private final ObjectMapper objectMapper;

    @Override
    public BillScanResponse scan(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Chưa chọn ảnh hóa đơn.");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("File quá lớn, tối đa 10MB.");
        }

        String mimeType = normalizeMime(file);
        if (mimeType == null || !ALLOWED_TYPES.contains(mimeType)) {
            throw new IllegalArgumentException("Chỉ hỗ trợ ảnh JPG/JPEG, PNG, WEBP hoặc PDF.");
        }

        if (log.isInfoEnabled()) {
            log.info("Quét bill: mime='{}', size={} bytes", mimeType, file.getSize());
        }

        GenerateContentConfig config = GenerateContentConfig.builder()
                .maxOutputTokens(4096)
                .responseMimeType("application/json") // JSON mode; bỏ dòng này nếu SDK bản của bạn báo lỗi
                .build();

        try {
            String raw = gemini.generateWithImage(PROMPT, file.getBytes(), mimeType, config);
            BillScanResponse parsed = objectMapper.readValue(extractJson(raw), BillScanResponse.class);
            return sanitize(parsed);
        } catch (IOException e) {
            throw new IllegalStateException("Không đọc được hóa đơn: " + e.getMessage(), e);
        }
    }

    /** Chuẩn hóa dữ liệu AI trả về để FE luôn nhận giá trị hợp lệ. */
    private BillScanResponse sanitize(BillScanResponse scanResp) {
        int qty = scanResp.quantity() == null ? 1 : Math.max(1, scanResp.quantity());
        long unit = scanResp.unitPrice() == null ? 0 : Math.max(0, scanResp.unitPrice());
        long total = scanResp.totalAmount() == null ? 0 : Math.max(0, scanResp.totalAmount());

        if (unit == 0 && total > 0) {
            unit = total / qty;
        }
        if (total == 0) {
            total = unit * qty;
        }

        String rawDate = blankToNull(scanResp.billDate());
        final String date = (rawDate != null && ISO_DATE.matcher(rawDate).matches()) ? rawDate : null;

        return new BillScanResponse(
                blankToNull(scanResp.storeName()),
                date,
                blankToNull(scanResp.receiptCode()),
                blankToNull(scanResp.itemName()),
                qty,
                unit,
                total,
                blankToNull(scanResp.notes()));
    }

    private String blankToNull(String str) {
        String result = null;
        if (str != null && !str.isBlank() && !"null".equalsIgnoreCase(str.trim())) {
            result = str.trim();
        }
        return result;
    }

    private String normalizeMime(MultipartFile file) {
        String result = null;
        if (file != null) {
            String contentType = file.getContentType();
            String mime = null;
            if (contentType != null && !contentType.isBlank() && !"application/octet-stream".equalsIgnoreCase(contentType.trim())) {
                mime = contentType.trim().toLowerCase(Locale.ROOT);
                int semicolon = mime.indexOf(';');
                if (semicolon > 0) {
                    mime = mime.substring(0, semicolon).trim();
                }
            } else {
                String name = file.getOriginalFilename();
                if (name != null) {
                    String lower = name.toLowerCase(Locale.ROOT);
                    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                        mime = "image/jpeg";
                    } else if (lower.endsWith(".png")) {
                        mime = "image/png";
                    } else if (lower.endsWith(".webp")) {
                        mime = "image/webp";
                    } else if (lower.endsWith(".pdf")) {
                        mime = "application/pdf";
                    }
                }
            }
            result = "image/jpg".equals(mime) ? "image/jpeg" : mime;
        }
        return result;
    }

    /** Lấy đoạn từ '{' đầu tới '}' cuối, bỏ qua ```json và chữ thừa. */
    private String extractJson(String text) throws IOException {
        int jsonStart = text == null ? -1 : text.indexOf('{');
        int jsonEnd = text == null ? -1 : text.lastIndexOf('}');
        if (jsonStart < 0 || jsonEnd <= jsonStart) {
            throw new IOException("Phản hồi AI không chứa JSON");
        }
        return text.substring(jsonStart, jsonEnd + 1);
    }
}