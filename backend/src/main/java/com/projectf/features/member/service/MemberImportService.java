package com.projectf.features.member.service;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.enums.Department;
import com.projectf.common.exception.ApiException;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.response.MemberImportReport;
import com.projectf.features.member.dto.response.MemberImportRow;
import com.projectf.features.member.dto.response.MemberResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MemberImportService {
    private static final String[] HEADERS = {"studentId", "fullName", "email", "phone", "department", "batch"};
    private static final int MAX_ROWS = 100;
    private static final int STUDENT_ID_LENGTH = 8;
    private static final int PHONE_MAX_LENGTH = 15;
    private final MemberService members;
    private final MemberCredentialService credentials;

    public MemberImportService(MemberService members, MemberCredentialService credentials) {
        this.members = members;
        this.credentials = credentials;
    }

    public byte[] template() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet data = workbook.createSheet("Thành viên");
            Row header = data.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                header.createCell(i).setCellValue(HEADERS[i]);
                data.setColumnWidth(i, 24 * 256);
            }
            Sheet guide = workbook.createSheet("Hướng dẫn");
            guide.createRow(0).createCell(0).setCellValue("Điền từ dòng 2 của sheet Thành viên; tối đa 100 dòng.");
            guide.createRow(1).createCell(0).setCellValue("MSSV 8 ký tự; email duy nhất; ban HR/PLAN/MEDIA/ACADEMIC hoặc để trống.");
            guide.createRow(2).createCell(0).setCellValue("Ví dụ: SE123456 | Nguyễn Văn A | a@example.com | 0900000000 | PLAN | K26");
            guide.createRow(3).createCell(0).setCellValue("Role mặc định MEMBER; tài khoản mới được gửi qua email.");
            guide.setColumnWidth(0, 100 * 256);
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Could not generate template", exception);
        }
    }

    public MemberImportReport importFile(MultipartFile file) {
        if (file.isEmpty() || file.getSize() > 1024 * 1024 || file.getOriginalFilename() == null
                || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw badFile("Chỉ nhận file .xlsx tối đa 1 MB");
        }
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheet("Thành viên");
            if (sheet == null) {
                throw badFile("Thiếu sheet Thành viên");
            }
            for (int i = 0; i < HEADERS.length; i++) {
                if (!HEADERS[i].equals(value(sheet.getRow(0), i))) {
                    throw badFile("Tiêu đề cột không đúng mẫu");
                }
            }
            long populated = 0;
            for (Row row : sheet) {
                if (row.getRowNum() > 0 && !blank(row)) {
                    populated++;
                }
            }
            if (populated > MAX_ROWS) {
                throw badFile("Tối đa 100 dòng dữ liệu");
            }
            List<MemberImportRow> results = new ArrayList<>();
            Set<String> ids = new HashSet<>();
            Set<String> emails = new HashSet<>();
            for (Row row : sheet) {
                if (row.getRowNum() == 0 || blank(row)) {
                    continue;
                }
                results.add(process(row, ids, emails));
            }
            int created = (int) results.stream().filter(row -> row.memberId() != null).count();
            int failed = (int) results.stream().filter(row -> !"CREATED".equals(row.status())
                    && !"AUTH_EXISTS".equals(row.status())).count();
            int existing = (int) results.stream().filter(row -> "AUTH_EXISTS".equals(row.status())).count();
            int mailFailed = (int) results.stream().filter(row -> "EMAIL_FAILED".equals(row.status())).count();
            return new MemberImportReport(results.size(), created, failed,
                    existing, mailFailed, results);
        } catch (ApiException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw badFile("Không đọc được file Excel", exception);
        }
    }

    private MemberImportRow process(Row row, Set<String> ids, Set<String> emails) {
        int number = row.getRowNum() + 1;
        String id = "";
        String name = "";
        String email = "";
        String phone = "";
        String department = "";
        String batch = "";
        String status = "FAILED";
        String reason = "";
        UUID memberId = null;
        try {
            // Công thức bị từ chối theo từng dòng để các dòng hợp lệ vẫn được nhập.
            id = value(row, 0).strip().toUpperCase(Locale.ROOT);
            name = value(row, 1).strip();
            email = value(row, 2).strip().toLowerCase(Locale.ROOT);
            phone = value(row, 3).strip();
            department = value(row, 4).strip().toUpperCase(Locale.ROOT);
            batch = value(row, 5).strip();
            if (id.length() != STUDENT_ID_LENGTH) {
                throw new IllegalArgumentException("MSSV phải có đúng 8 ký tự");
            }
            if (name.isBlank() || name.length() > 100) {
                throw new IllegalArgumentException("Họ tên bắt buộc và tối đa 100 ký tự");
            }
            if (email.isBlank() || email.length() > 100
                    || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                throw new IllegalArgumentException("Email không hợp lệ hoặc quá 100 ký tự");
            }
            if (phone.length() > PHONE_MAX_LENGTH) {
                throw new IllegalArgumentException("Điện thoại tối đa 15 ký tự");
            }
            if (batch.isBlank() || batch.length() > 4) {
                throw new IllegalArgumentException("Khóa bắt buộc và tối đa 4 ký tự");
            }
            Department parsed = null;
            if (!department.isBlank()) {
                try {
                    parsed = Department.valueOf(department);
                } catch (IllegalArgumentException exception) {
                    throw new IllegalArgumentException("Ban không hợp lệ", exception);
                }
            }
            if (!ids.add(id) || !emails.add(email)) {
                throw new IllegalArgumentException("Trùng MSSV hoặc email trong file");
            }
            MemberResponse member = members.create(new CreateMemberRequest(id, name, email,
                    phone.isBlank() ? null : phone, parsed, ClubRole.MEMBER, batch));
            memberId = member.id();
            try {
                status = credentials.provision(member);
            } catch (org.springframework.mail.MailException exception) {
                status = "EMAIL_FAILED";
                reason = "Đã tạo tài khoản nhưng gửi email thất bại; dùng chức năng gửi lại";
            } catch (RuntimeException exception) {
                status = "AUTH_FAILED";
                reason = "Đã tạo hồ sơ nhưng cấp tài khoản thất bại; kiểm tra Supabase Auth";
            }
        } catch (ApiException exception) {
            reason = "DUPLICATE_RESOURCE".equals(exception.getCode())
                    ? "MSSV hoặc email đã tồn tại" : exception.getMessage();
        } catch (IllegalArgumentException exception) {
            reason = exception.getMessage();
        } catch (RuntimeException exception) {
            reason = "Dữ liệu dòng không hợp lệ";
        }
        return new MemberImportRow(number, id, name, email, phone, department, batch, status, reason, memberId);
    }

    private static boolean blank(Row row) {
        boolean empty = true;
        for (int i = 0; i < HEADERS.length; i++) {
            Cell cell = row.getCell(i);
            if (cell != null && (cell.getCellType() == CellType.FORMULA || !value(row, i).isBlank())) {
                empty = false;
            }
        }
        return empty;
    }

    private static String value(Row row, int index) {
        String result = "";
        if (row != null) {
            Cell cell = row.getCell(index);
            if (cell != null) {
                if (cell.getCellType() == CellType.FORMULA) {
                    throw badFile("Không nhận công thức Excel");
                }
                result = new DataFormatter(Locale.ROOT).formatCellValue(cell);
            }
        }
        return result;
    }

    private static ApiException badFile(String message) {
        return badFile(message, null);
    }

    private static ApiException badFile(String message, Throwable cause) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMPORT_FILE", message, cause);
    }
}
