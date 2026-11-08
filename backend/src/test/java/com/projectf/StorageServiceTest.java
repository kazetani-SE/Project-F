package com.projectf;

import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import com.projectf.features.storage.enums.StorageCategory;
import com.projectf.features.storage.service.impl.S3StorageServiceImpl;
import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class StorageServiceTest {

    private S3Presigner s3Presigner;
    private S3StorageServiceImpl storageService;

    @BeforeEach
    void setUp() {
        s3Presigner = Mockito.mock(S3Presigner.class);
        storageService = new S3StorageServiceImpl(
                s3Presigner,
                "test-bucket",
                "ap-southeast-1",
                10
        );
    }

    @Test
    void generatePresignedUploadUrlSuccess() throws Exception {
        PresignedPutObjectRequest mockPresigned = Mockito.mock(PresignedPutObjectRequest.class);
        when(mockPresigned.url()).thenReturn(URI.create("https://test-bucket.s3.ap-southeast-1.amazonaws.com/receipts/test.jpg?signed=true").toURL());
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(mockPresigned);

        PresignedUploadRequest request = new PresignedUploadRequest(
                "bill.jpg",
                "image/jpeg",
                2L * 1024 * 1024,
                StorageCategory.RECEIPT
        );

        PresignedUploadResponse response = storageService.generatePresignedUploadUrl(request);

        assertNotNull(response);
        assertEquals(10, response.expiresInMinutes());
        assertTrue(response.objectKey().startsWith("receipts/"));
        assertTrue(response.fileUrl().contains("test-bucket.s3.ap-southeast-1.amazonaws.com/receipts/"));
    }

    @Test
    void rejectsReceiptWhenExceeding15Mb() {
        PresignedUploadRequest request = new PresignedUploadRequest(
                "heavy-receipt.pdf",
                "application/pdf",
                16L * 1024 * 1024,
                StorageCategory.RECEIPT
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> storageService.generatePresignedUploadUrl(request)
        );
        assertTrue(ex.getMessage().contains("15MB"));
    }

    @Test
    void rejectsReceiptWithInvalidMimeType() {
        PresignedUploadRequest request = new PresignedUploadRequest(
                "archive.zip",
                "application/zip",
                1024L,
                StorageCategory.RECEIPT
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> storageService.generatePresignedUploadUrl(request)
        );
        assertTrue(ex.getMessage().contains("không được hỗ trợ"));
    }

    @Test
    void rejectsDocumentWhenExceeding50Mb() {
        PresignedUploadRequest request = new PresignedUploadRequest(
                "giant-plan.pdf",
                "application/pdf",
                51L * 1024 * 1024,
                StorageCategory.DOCUMENT
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> storageService.generatePresignedUploadUrl(request)
        );
        assertTrue(ex.getMessage().contains("50MB"));
    }

    @Test
    void preservesVietnameseUtf8FileNameOnS3UploadAndDownload() throws Exception {
        PresignedPutObjectRequest mockPut = Mockito.mock(PresignedPutObjectRequest.class);
        when(mockPut.url()).thenReturn(URI.create("https://test-bucket.s3.ap-southeast-1.amazonaws.com/documents/signed").toURL());
        ArgumentCaptor<PutObjectPresignRequest> putCaptor = ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        when(s3Presigner.presignPutObject(putCaptor.capture())).thenReturn(mockPut);

        String originalName = "Ôn tập. Bài 4.5 JPD123.pdf";
        PresignedUploadRequest uploadReq = new PresignedUploadRequest(
                originalName,
                "application/pdf",
                1024L,
                StorageCategory.DOCUMENT
        );

        PresignedUploadResponse uploadRes = storageService.generatePresignedUploadUrl(uploadReq);
        assertEquals("documents/" + originalName, uploadRes.objectKey());
        assertEquals("documents/" + originalName, putCaptor.getValue().putObjectRequest().key());

        PresignedGetObjectRequest mockGet = Mockito.mock(PresignedGetObjectRequest.class);
        when(mockGet.url()).thenReturn(URI.create("https://test-bucket.s3.ap-southeast-1.amazonaws.com/documents/download").toURL());
        ArgumentCaptor<GetObjectPresignRequest> getCaptor = ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        when(s3Presigner.presignGetObject(getCaptor.capture())).thenReturn(mockGet);

        String encodedUrlWithVersion = "https://test-bucket.s3.ap-southeast-1.amazonaws.com/documents/%C3%94n%20t%E1%BA%ADp.%20B%C3%A0i%204.5%20JPD123.pdf?versionId=test%2Bver%2F123";
        PresignedDownloadResponse downloadRes = storageService.generatePresignedDownloadUrl(encodedUrlWithVersion);

        assertEquals("documents/Ôn tập. Bài 4.5 JPD123.pdf", downloadRes.objectKey());
        assertEquals("documents/Ôn tập. Bài 4.5 JPD123.pdf", getCaptor.getValue().getObjectRequest().key());
        assertEquals("test+ver/123", getCaptor.getValue().getObjectRequest().versionId());
    }

    @Test
    void rejectsDocumentWithUnsupportedExecutableMimeType() {
        PresignedUploadRequest request = new PresignedUploadRequest(
                "malware.exe",
                "application/x-msdownload",
                1024L,
                StorageCategory.DOCUMENT
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> storageService.generatePresignedUploadUrl(request)
        );
        assertTrue(ex.getMessage().contains("không được hỗ trợ"));
    }

    @Test
    void allowsExcelSpreadsheetUploadForFeedbackCategory() throws Exception {
        PresignedPutObjectRequest mockPresigned = Mockito.mock(PresignedPutObjectRequest.class);
        when(mockPresigned.url()).thenReturn(URI.create("https://test-bucket.s3.ap-southeast-1.amazonaws.com/feedbacks/khao_sat.xlsx?signed=true").toURL());
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(mockPresigned);

        PresignedUploadRequest request = new PresignedUploadRequest(
                "khao_sat_google_forms.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                2L * 1024 * 1024,
                StorageCategory.FEEDBACK
        );

        PresignedUploadResponse response = storageService.generatePresignedUploadUrl(request);
        assertNotNull(response);
        assertEquals("feedbacks/khao_sat_google_forms.xlsx", response.objectKey());
    }

    @Test
    void generatePresignedDownloadUrlSuccess() throws Exception {
        PresignedGetObjectRequest mockPresigned = Mockito.mock(PresignedGetObjectRequest.class);
        when(mockPresigned.url()).thenReturn(URI.create("https://test-bucket.s3.ap-southeast-1.amazonaws.com/documents/test.pdf?signed=true").toURL());
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(mockPresigned);

        PresignedDownloadResponse response = storageService.generatePresignedDownloadUrl("documents/uuid-test.pdf");

        assertNotNull(response);
        assertEquals(15, response.expiresInMinutes());
        assertEquals("documents/uuid-test.pdf", response.objectKey());
    }

    @Test
    void deleteFileThrowsOnNullOrBlank() {
        assertThrows(IllegalArgumentException.class, () -> storageService.deleteFile(null));
        assertThrows(IllegalArgumentException.class, () -> storageService.deleteFile("   "));
    }

    @Test
    void deleteFileCallsS3ClientWhenConfigured() {
        S3Client mockS3 = Mockito.mock(S3Client.class);
        S3StorageServiceImpl serviceWithClient = new S3StorageServiceImpl(
                s3Presigner,
                mockS3,
                "test-bucket",
                "ap-southeast-1",
                10
        );

        serviceWithClient.deleteFile("documents/test-plan.pdf");

        ArgumentCaptor<DeleteObjectRequest> captor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        Mockito.verify(mockS3).deleteObject(captor.capture());
        assertEquals("test-bucket", captor.getValue().bucket());
        assertEquals("documents/test-plan.pdf", captor.getValue().key());
    }
}
