package com.projectf.migration;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class MigrationFilesTest {
    @Test void discoversVersionedFilesAndChecksums() throws Exception {
        var files = MigrationTool.discover(Path.of("../backend/src/main/resources/db/migration"));
        assertEquals(1, files.size());
        assertEquals(1, files.get(0).version());
        assertEquals("V1__init_schema.sql", files.get(0).path().getFileName().toString());
        assertEquals(64, files.get(0).checksum().length());
    }

    @Test void rejectsDuplicateVersions() throws Exception {
        var dir = java.nio.file.Files.createTempDirectory("migrations");
        try {
            java.nio.file.Files.writeString(dir.resolve("V1__first.sql"), "select 1;");
            java.nio.file.Files.writeString(dir.resolve("V1__second.sql"), "select 2;");
            assertThrows(IllegalStateException.class, () -> MigrationTool.discover(dir));
        } finally {
            try (var files = java.nio.file.Files.list(dir)) {
                files.forEach(p -> { try { java.nio.file.Files.delete(p); } catch (Exception e) { throw new RuntimeException(e); } });
            }
            java.nio.file.Files.delete(dir);
        }
    }
}
