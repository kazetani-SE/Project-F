package com.projectf.migration;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;

/** Chạy migration PostgreSQL độc lập; Spring Boot không tự gọi công cụ này khi khởi động. */
public final class MigrationTool {
    // Giữ quy ước tên V1__init_schema.sql để cùng bộ SQL chạy trên Supabase dev và RDS production.
    private static final Pattern MIGRATION_FILENAME_PATTERN = Pattern.compile("V([1-9][0-9]*)__([a-zA-Z0-9_]+)\\.sql");
    private MigrationTool() {}

    public record Migration(long version, Path path, String checksum) {
        public String filename() { return path.getFileName().toString(); }
    }

    public static List<Migration> discover(Path dir) throws Exception {
        var found = new TreeMap<Long, Migration>();
        try (var paths = Files.list(dir)) {
            for (var path : paths.filter(Files::isRegularFile).toList()) {
                var match = MIGRATION_FILENAME_PATTERN.matcher(path.getFileName().toString());
                if (!match.matches()) {
                    if (path.toString().endsWith(".sql")) throw new IllegalStateException("Invalid migration name: " + path);
                    continue;
                }
                // Chỉ chuẩn hóa line endings; thay đổi nội dung SQL vẫn đổi checksum.
                String sql = Files.readString(path).replace("\r\n", "\n").replace('\r', '\n');
                var digest = MessageDigest.getInstance("SHA-256").digest(sql.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                var checksum = HexFormat.of().formatHex(digest);
                var migration = new Migration(Long.parseLong(match.group(1)), path, checksum);
                if (found.putIfAbsent(migration.version(), migration) != null)
                    throw new IllegalStateException("Duplicate migration version: " + migration.version());
            }
        }
        if (found.isEmpty()) throw new IllegalStateException("No migrations in " + dir);
        return List.copyOf(found.values());
    }

    public static Path resolveDirectory(Path workingDirectory, String explicitDirectory) {
        if (explicitDirectory != null) {
            Path path = workingDirectory.resolve(explicitDirectory).toAbsolutePath().normalize();
            if (!Files.isDirectory(path)) { throw new IllegalStateException("Migration directory missing: " + path); }
            return path;
        }
        for (Path parent = workingDirectory.toAbsolutePath().normalize(); parent != null; parent = parent.getParent()) {
            Path candidate = parent.resolve("backend/src/main/resources/db/migration");
            if (Files.isDirectory(candidate)) { return candidate; }
        }
        throw new IllegalStateException("Cannot find SQL directory; pass --directory <path>");
    }

    public static void main(String[] args) throws Exception {
        if ((args.length != 1 && args.length != 3) || !Set.of("migrate", "validate", "baseline").contains(args[0])
                || (args.length == 3 && !"--directory".equals(args[1]))) {
            throw new IllegalArgumentException("Usage: MigrationTool migrate|validate|baseline [--directory <path>]");
        }
        var url = required("DB_URL");
        var user = required("DB_USERNAME");
        var password = required("DB_PASSWORD");
        var migrations = discover(resolveDirectory(Path.of(""), args.length == 3 ? args[2] : null));
        try (var db = DriverManager.getConnection(url, user, password)) {
            // Advisory lock nằm trong transaction: hai lần triển khai không thể cùng ghi lịch sử.
            db.setAutoCommit(false);
            try {
                run(db, migrations, args[0]);
                db.commit();
            } catch (Exception failure) {
                try { db.rollback(); } catch (SQLException rollbackFailure) { failure.addSuppressed(rollbackFailure); }
                throw failure;
            }
        }
    }

    private static void run(Connection db, List<Migration> migrations, String command) throws Exception {
        initializeHistory(db);
        var applied = loadHistory(db);
        validateHistory(migrations, applied);
        if ("baseline".equals(command)) {
            baseline(db, migrations, applied);
        } else if ("migrate".equals(command)) {
            applyPending(db, migrations, applied);
        } else {
            System.out.println("Validated " + applied.size() + " applied migrations");
        }
    }

    private static void initializeHistory(Connection db) throws SQLException {
        try (var lock = db.prepareStatement("SELECT pg_advisory_xact_lock(87321409)")) { lock.execute(); }
        try (var statement = db.createStatement()) {
            statement.execute("CREATE SCHEMA IF NOT EXISTS migration_meta");
            statement.execute("CREATE TABLE IF NOT EXISTS migration_meta.schema_migration_history (version bigint PRIMARY KEY, filename text NOT NULL, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
        }
    }

    private static Map<Long, Migration> loadHistory(Connection db) throws SQLException {
        var applied = new HashMap<Long, Migration>();
        try (var statement = db.createStatement(); var rows = statement.executeQuery("SELECT version, filename, checksum FROM migration_meta.schema_migration_history")) {
            while (rows.next()) applied.put(rows.getLong(1), new Migration(rows.getLong(1), Path.of(rows.getString(2)), rows.getString(3).trim()));
        }
        return applied;
    }

    static void validateHistory(List<Migration> migrations, Map<Long, Migration> applied) {
        var known = new HashSet<Long>();
        for (var migration : migrations) {
            known.add(migration.version());
            var prior = applied.get(migration.version());
            if (prior != null && (!prior.checksum().equals(migration.checksum()) || !prior.filename().equals(migration.filename())))
                throw new IllegalStateException("Applied migration changed: " + migration.path());
        }
        for (var version : applied.keySet()) if (!known.contains(version)) throw new IllegalStateException("Applied migration file missing: V" + version);
        // Không chèn migration cũ vào giữa các phiên bản đã triển khai trên database này.
        long highestApplied = 0;
        for (long version : applied.keySet()) { highestApplied = Math.max(highestApplied, version); }
        for (var migration : migrations) if (!applied.containsKey(migration.version()) && migration.version() < highestApplied)
            throw new IllegalStateException("Pending migration is older than applied version: " + migration.path());
    }

    private static void baseline(Connection db, List<Migration> migrations, Map<Long, Migration> applied) throws SQLException {
        // Database dev đã có V1: chỉ ghi lịch sử sau khi người vận hành đối chiếu schema.
        // Danh sách bảng/view do người vận hành cấu hình; không thay thế schema diff thủ công.
        if (!applied.isEmpty()) throw new IllegalStateException("History is not empty");
        if (!Boolean.parseBoolean(required("BASELINE_SCHEMA_VERIFIED"))) throw new IllegalStateException("Set BASELINE_SCHEMA_VERIFIED=true only after comparing live schema with V1");
        if (migrations.get(0).version() != 1) throw new IllegalStateException("V1 required for baseline");
        try (var statement = db.prepareStatement("SELECT to_regclass(?) IS NOT NULL")) {
            for (String relation : required("BASELINE_REQUIRED_RELATIONS").split(",", -1)) {
                if (relation.isBlank()) { throw new IllegalStateException("Empty baseline relation"); }
                statement.setString(1, relation.trim());
                try (var rows = statement.executeQuery()) {
                    rows.next();
                    if (!rows.getBoolean(1)) { throw new IllegalStateException("Baseline relation missing: " + relation); }
                }
            }
        }
        record(db, migrations.get(0));
        System.out.println("Recorded existing V1 without executing SQL");
    }

    private static void applyPending(Connection db, List<Migration> migrations, Map<Long, Migration> applied) throws Exception {
        for (var migration : migrations) {
            if (applied.containsKey(migration.version())) continue;
            // SQL và bản ghi checksum cùng transaction; lỗi sẽ rollback cả đợt triển khai.
            try (var statement = db.createStatement()) { statement.execute(Files.readString(migration.path())); }
            record(db, migration);
            System.out.println("Applied " + migration.filename());
        }
    }

    private static void record(Connection db, Migration migration) throws SQLException {
        try (var insert = db.prepareStatement("INSERT INTO migration_meta.schema_migration_history(version, filename, checksum) VALUES (?, ?, ?)")) {
            insert.setLong(1, migration.version());
            insert.setString(2, migration.filename());
            insert.setString(3, migration.checksum());
            insert.executeUpdate();
        }
    }

    private static String required(String name) {
        var value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException(name + " is required");
        return value;
    }
}
