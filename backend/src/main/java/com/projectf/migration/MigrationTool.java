package com.projectf.migration;

import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.*;
import java.util.*;
import java.util.regex.Pattern;

/** Chạy migration PostgreSQL độc lập; Spring Boot không tự gọi công cụ này khi khởi động. */
public final class MigrationTool {
    // Giữ quy ước tên V1__init_schema.sql để cùng bộ SQL chạy trên Supabase dev và RDS production.
    private static final Pattern NAME = Pattern.compile("V([1-9][0-9]*)__([a-zA-Z0-9_]+)\\.sql");
    private MigrationTool() {}

    public record Migration(long version, Path path, String checksum) {}

    public static List<Migration> discover(Path dir) throws Exception {
        var found = new TreeMap<Long, Migration>();
        try (var paths = Files.list(dir)) {
            for (var path : paths.filter(Files::isRegularFile).toList()) {
                var match = NAME.matcher(path.getFileName().toString());
                if (!match.matches()) {
                    if (path.toString().endsWith(".sql")) throw new IllegalStateException("Invalid migration name: " + path);
                    continue;
                }
                // Hash nội dung gốc; sửa một migration đã chạy sẽ bị phát hiện kể cả SQL vẫn hợp lệ.
                var digest = MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(path));
                var checksum = HexFormat.of().formatHex(digest);
                var migration = new Migration(Long.parseLong(match.group(1)), path, checksum);
                if (found.putIfAbsent(migration.version(), migration) != null)
                    throw new IllegalStateException("Duplicate migration version: " + migration.version());
            }
        }
        if (found.isEmpty()) throw new IllegalStateException("No migrations in " + dir);
        return List.copyOf(found.values());
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1 || !Set.of("migrate", "validate", "baseline").contains(args[0]))
            throw new IllegalArgumentException("Usage: MigrationTool migrate|validate|baseline");
        var url = required("DB_URL");
        var user = required("DB_USERNAME");
        var password = required("DB_PASSWORD");
        var migrations = discover(Path.of("../backend/src/main/resources/db/migration"));
        try (var db = DriverManager.getConnection(url, user, password)) {
            // Advisory lock nằm trong transaction: hai lần triển khai không thể cùng ghi lịch sử.
            db.setAutoCommit(false);
            try (var lock = db.prepareStatement("SELECT pg_advisory_xact_lock(87321409)")) { lock.execute(); }
            try (var s = db.createStatement()) {
                s.execute("CREATE SCHEMA IF NOT EXISTS migration_meta");
                s.execute("CREATE TABLE IF NOT EXISTS migration_meta.schema_migration_history (version bigint PRIMARY KEY, filename text NOT NULL, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
            }
            var applied = new HashMap<Long, Migration>();
            try (var s = db.createStatement(); var rows = s.executeQuery("SELECT version, filename, checksum FROM migration_meta.schema_migration_history")) {
                while (rows.next()) applied.put(rows.getLong(1), new Migration(rows.getLong(1), Path.of(rows.getString(2)), rows.getString(3).trim()));
            }
            var known = new HashSet<Long>();
            for (var migration : migrations) {
                known.add(migration.version());
                var prior = applied.get(migration.version());
                if (prior != null && (!prior.checksum().equals(migration.checksum()) || !prior.path().getFileName().equals(migration.path().getFileName())))
                    throw new IllegalStateException("Applied migration changed: " + migration.path());
            }
            for (var version : applied.keySet()) if (!known.contains(version)) throw new IllegalStateException("Applied migration file missing: V" + version);
            // Không chèn migration cũ vào giữa các phiên bản đã triển khai trên database này.
            long highestApplied = applied.keySet().stream().mapToLong(Long::longValue).max().orElse(0);
            for (var migration : migrations) if (!applied.containsKey(migration.version()) && migration.version() < highestApplied)
                throw new IllegalStateException("Pending migration is older than applied version: " + migration.path());
            if (args[0].equals("baseline")) {
                // Database dev đã có V1: chỉ ghi lịch sử sau khi người vận hành đối chiếu schema.
                // Kiểm tra hai bảng chỉ chặn nhầm database trống, không thay thế việc đối chiếu thủ công.
                if (!applied.isEmpty()) throw new IllegalStateException("History is not empty");
                if (!Boolean.parseBoolean(required("BASELINE_SCHEMA_VERIFIED"))) throw new IllegalStateException("Set BASELINE_SCHEMA_VERIFIED=true only after comparing live schema with V1");
                if (migrations.get(0).version() != 1) throw new IllegalStateException("V1 required for baseline");
                try (var s = db.createStatement(); var rows = s.executeQuery("SELECT to_regclass('public.club_members') IS NOT NULL AND to_regclass('public.events') IS NOT NULL")) {
                    rows.next();
                    if (!rows.getBoolean(1)) throw new IllegalStateException("Baseline requires existing V1 tables");
                }
                record(db, migrations.get(0));
                System.out.println("Recorded existing V1 without executing SQL");
            } else if (args[0].equals("migrate")) {
                for (var migration : migrations) {
                    if (applied.containsKey(migration.version())) continue;
                    // SQL và bản ghi checksum cùng transaction; lỗi sẽ rollback cả đợt triển khai.
                    try (var s = db.createStatement()) { s.execute(Files.readString(migration.path())); }
                    record(db, migration);
                    System.out.println("Applied " + migration.path().getFileName());
                }
            } else System.out.println("Validated " + applied.size() + " applied migrations");
            db.commit();
        }
    }

    private static void record(Connection db, Migration migration) throws SQLException {
        try (var insert = db.prepareStatement("INSERT INTO migration_meta.schema_migration_history(version, filename, checksum) VALUES (?, ?, ?)")) {
            insert.setLong(1, migration.version());
            insert.setString(2, migration.path().getFileName().toString());
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
