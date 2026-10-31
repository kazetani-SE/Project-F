package com.projectf;

import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import com.projectf.features.storage.enums.StorageCategory;
import com.projectf.features.storage.service.impl.S3StorageServiceImpl;
import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
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
    void generatePresignedDownloadUrlSuccess() throws Exception {
        PresignedGetObjectRequest mockPresigned = Mockito.mock(PresignedGetObjectRequest.class);
        when(mockPresigned.url()).thenReturn(URI.create("https://test-bucket.s3.ap-southeast-1.amazonaws.com/documents/test.pdf?signed=true").toURL());
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(mockPresigned);

        PresignedDownloadResponse response = storageService.generatePresignedDownloadUrl("documents/uuid-test.pdf");

        assertNotNull(response);
        assertEquals(15, response.expiresInMinutes());
        assertEquals("documents/uuid-test.pdf", response.objectKey());
    }
}
