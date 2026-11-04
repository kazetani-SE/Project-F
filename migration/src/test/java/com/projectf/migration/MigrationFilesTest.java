package com.projectf.migration;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class MigrationFilesTest {
    @org.junit.jupiter.api.io.TempDir Path temporaryDirectory;

    @Test void rejectsChangedMissingAndOutOfOrderAppliedMigrations() {
        var first = new MigrationTool.Migration(1, Path.of("V1__first.sql"), "original");
        var second = new MigrationTool.Migration(2, Path.of("V2__second.sql"), "second");
        var history = java.util.Map.of(1L, first);
        assertDoesNotThrow(() -> MigrationTool.validateHistory(java.util.List.of(first, second), history));
        assertThrows(IllegalStateException.class, () -> MigrationTool.validateHistory(
                java.util.List.of(new MigrationTool.Migration(1, first.path(), "changed")), history));
        assertThrows(IllegalStateException.class, () -> MigrationTool.validateHistory(java.util.List.of(second), history));
        assertThrows(IllegalStateException.class, () -> MigrationTool.validateHistory(
                java.util.List.of(first, second), java.util.Map.of(2L, second)));
    }

    @Test void checksumIgnoresLineEndingsButDetectsSqlChanges() throws Exception {
        Path file = temporaryDirectory.resolve("V1__initial.sql");
        java.nio.file.Files.writeString(file, "select 1;\r\nselect 2;\r\n");
        String windowsHash = MigrationTool.discover(temporaryDirectory).get(0).checksum();
        java.nio.file.Files.writeString(file, "select 1;\nselect 2;\n");
        assertEquals(windowsHash, MigrationTool.discover(temporaryDirectory).get(0).checksum());
        java.nio.file.Files.writeString(file, "select 3;\n");
        assertNotEquals(windowsHash, MigrationTool.discover(temporaryDirectory).get(0).checksum());
    }

    @Test void resolvesDirectoryFromRootAndModule() throws Exception {
        Path directory = temporaryDirectory.resolve("backend/src/main/resources/db/migration");
        java.nio.file.Files.createDirectories(directory);
        Path module = java.nio.file.Files.createDirectory(temporaryDirectory.resolve("migration"));
        assertEquals(directory, MigrationTool.resolveDirectory(temporaryDirectory, null));
        assertEquals(directory, MigrationTool.resolveDirectory(module, null));
        assertEquals(directory, MigrationTool.resolveDirectory(module, directory.toString()));
        assertThrows(IllegalStateException.class, () -> MigrationTool.resolveDirectory(module, "missing"));
    }
    @Test void discoversVersionedFilesAndChecksums() throws Exception {
        var files = MigrationTool.discover(Path.of("../backend/src/main/resources/db/migration"));
        assertFalse(files.isEmpty());
        assertEquals(1, files.get(0).version());
        assertEquals("V1__init_schema.sql", files.get(0).filename());
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
