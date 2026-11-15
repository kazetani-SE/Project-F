package com.projectf;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.projectf.common.exception.ApiException;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.service.MemberCredentialService;
import com.projectf.features.member.service.MemberImportService;
import com.projectf.features.member.service.MemberService;
import com.projectf.common.enums.ClubRole;
import java.io.ByteArrayOutputStream;
import java.util.UUID;
import org.mockito.ArgumentCaptor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mail.MailSendException;

class MemberImportServiceTest {
    private final MemberService members = mock(MemberService.class);
    private final MemberCredentialService credentials = mock(MemberCredentialService.class);
    private final MemberImportService importer = new MemberImportService(members, credentials);

    @Test
    void templateHasSeparateExampleSheet() throws Exception {
        try (var book = new XSSFWorkbook(new java.io.ByteArrayInputStream(importer.template()))) {
            assertEquals("studentId", book.getSheet("Thành viên").getRow(0).getCell(0).getStringCellValue());
            assertEquals(0, book.getSheet("Thành viên").getLastRowNum());
            assertEquals(1, book.getSheetIndex("Hướng dẫn"));
        }
    }

    @Test
    void duplicatesInFileFailPerRowWithoutCreatingTwice() throws Exception {
        var response = new MemberResponse(UUID.randomUUID(), "SE123456", "Nguyễn Văn A", "a@example.test",
                null, null, com.projectf.common.enums.ClubRole.MEMBER, "K26", true, null, null);
        when(members.create(any())).thenReturn(response);
        when(credentials.provision(response)).thenReturn("CREATED");
        var report = importer.importFile(file(2));
        assertEquals(2, report.total());
        assertEquals(1, report.created());
        assertEquals(1, report.failed());
        assertEquals("FAILED", report.rows().get(1).status());
        verify(members).create(any());
    }

    @Test
    void rejectsMoreThanHundredBeforeAnyMutation() throws Exception {
        assertThrows(ApiException.class, () -> importer.importFile(file(101)));
        org.mockito.Mockito.verifyNoInteractions(members, credentials);
    }

    @Test
    void formulaFailsItsRowAndNextValidRowContinues() throws Exception {
        var source = file(2);
        MockMultipartFile changed;
        try (var book = new XSSFWorkbook(source.getInputStream()); var output = new ByteArrayOutputStream()) {
            var sheet = book.getSheet("Thành viên");
            sheet.getRow(1).getCell(1).setCellFormula("1+1");
            sheet.getRow(2).getCell(0).setCellValue("SE123457");
            sheet.getRow(2).getCell(2).setCellValue("b@example.test");
            book.write(output);
            changed = new MockMultipartFile("file", "members.xlsx", source.getContentType(), output.toByteArray());
        }
        var response = new MemberResponse(UUID.randomUUID(), "SE123457", "Nguyễn Văn B", "b@example.test",
                null, null, ClubRole.MEMBER, "K26", true, null, null);
        when(members.create(any())).thenReturn(response);
        when(credentials.provision(response)).thenReturn("CREATED");
        var report = importer.importFile(changed);
        assertEquals("FAILED", report.rows().get(0).status());
        assertEquals("CREATED", report.rows().get(1).status());
        var request = ArgumentCaptor.forClass(com.projectf.features.member.dto.request.CreateMemberRequest.class);
        verify(members).create(request.capture());
        assertEquals(ClubRole.MEMBER, request.getValue().clubRole());
    }

    @Test
    void mailFailureKeepsCreatedMemberWithoutLeakingCredentials() throws Exception {
        var response = new MemberResponse(UUID.randomUUID(), "SE123456", "Nguyễn Văn A", "a@example.test",
                null, null, ClubRole.MEMBER, "K26", true, null, null);
        when(members.create(any())).thenReturn(response);
        when(credentials.provision(response)).thenThrow(new MailSendException("secret-password-must-not-leak"));
        var report = importer.importFile(file(1));
        assertEquals("EMAIL_FAILED", report.rows().get(0).status());
        assertEquals(response.id(), report.rows().get(0).memberId());
        assertFalse(report.toString().contains("secret-password-must-not-leak"));
    }

    @Test
    void invalidDepartmentIsReportedForItsRow() throws Exception {
        var source = file(1);
        MockMultipartFile changed;
        try (var book = new XSSFWorkbook(source.getInputStream()); var output = new ByteArrayOutputStream()) {
            book.getSheet("Thành viên").getRow(1).getCell(4).setCellValue("UNKNOWN");
            book.write(output);
            changed = new MockMultipartFile("file", "members.xlsx", source.getContentType(), output.toByteArray());
        }
        var report = importer.importFile(changed);
        assertEquals("FAILED", report.rows().get(0).status());
        assertEquals("Ban không hợp lệ", report.rows().get(0).reason());
        org.mockito.Mockito.verifyNoInteractions(members, credentials);
    }

    private static MockMultipartFile file(int count) throws Exception {
        try (var book = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            var sheet = book.createSheet("Thành viên");
            String[] names = {"studentId", "fullName", "email", "phone", "department", "batch"};
            var header = sheet.createRow(0);
            for (int index = 0; index < names.length; index++) header.createCell(index).setCellValue(names[index]);
            for (int index = 1; index <= count; index++) {
                var row = sheet.createRow(index);
                row.createCell(0).setCellValue("SE123456");
                row.createCell(1).setCellValue("Nguyễn Văn A");
                row.createCell(2).setCellValue("a@example.test");
                row.createCell(4).setCellValue("PLAN");
                row.createCell(5).setCellValue("K26");
            }
            book.write(output);
            return new MockMultipartFile("file", "members.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", output.toByteArray());
        }
    }
}
