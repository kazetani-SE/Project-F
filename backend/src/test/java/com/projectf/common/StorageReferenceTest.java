package com.projectf.common;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class StorageReferenceTest {
    @Test
    void acceptsOnlyOwnBucketAndCategoryPrefix() {
        final StorageReference reference = new StorageReference("project-f-files", "ap-southeast-1");
        final String valid = "https://project-f-files.s3.ap-southeast-1.amazonaws.com/receipts/123e4567-e89b-12d3-a456-426614174000.jpg";
        assertDoesNotThrow(() -> reference.require("RECEIPT", valid));
        assertThrows(IllegalArgumentException.class,
                () -> reference.require("DOCUMENT", valid));
        assertThrows(IllegalArgumentException.class,
                () -> reference.require("RECEIPT", "https://evil.example/receipts/123e4567-e89b-12d3-a456-426614174000.jpg"));
        assertThrows(IllegalArgumentException.class,
                () -> reference.require("RECEIPT", valid + "?token=unsafe"));
    }
}
