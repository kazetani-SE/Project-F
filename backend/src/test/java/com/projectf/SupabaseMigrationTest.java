package com.projectf;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@EnabledIf("postgresAvailable")
class SupabaseMigrationTest {
    // URL tùy chọn phải trỏ tới database trống, dùng một lần và tách khỏi CorePostgresIntegrationTest.
    private static final String LOCAL_URL = System.getenv("PROJECTF_MIGRATION_TEST_POSTGRES_URL");
    private static PostgreSQLContainer<?> database;
    private static String jdbcUrl;
    private static String username;
    private static String password;

    static boolean postgresAvailable() {
        return LOCAL_URL != null || DockerClientFactory.instance().isDockerAvailable();
    }

    @BeforeAll
    static void migrate() throws Exception {
        if (LOCAL_URL == null) {
            database = new PostgreSQLContainer<>("postgres:17");
            database.start();
            jdbcUrl = database.getJdbcUrl();
            username = database.getUsername();
            password = database.getPassword();
        } else {
            jdbcUrl = LOCAL_URL;
            username = System.getenv().getOrDefault("PROJECTF_MIGRATION_TEST_POSTGRES_USER", "postgres");
            password = System.getenv().getOrDefault("PROJECTF_MIGRATION_TEST_POSTGRES_PASSWORD", "");
        }
        try (Connection connection = connection(); Statement sql = connection.createStatement();
             var files = Files.list(Path.of("..", "supabase", "migrations"))) {
            sql.execute("""
                    create role anon;
                    create role authenticated;
                    create schema auth;
                    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
                    alter table auth.users enable row level security;
                    alter default privileges grant all on tables to anon, authenticated;
                    """);
            for (Path migration : files.filter(path -> path.toString().endsWith(".sql")).sorted().toList()) {
                if (migration.getFileName().toString().contains("normalize_event_roles")) {
                    sql.execute("""
                            insert into club_members(id, student_id, full_name, email, batch)
                            values ('00000000-0000-4000-8000-000000000090', 'SE000090', 'Legacy Organizer',
                                'legacy@example.test', 'K20');
                            insert into events(id, season_name, title, expected_start_date, expected_end_date)
                            values ('00000000-0000-4000-8000-000000000091', '2026', 'Legacy Event',
                                '2026-11-11', '2026-11-12');
                            insert into event_organizers(event_id, member_id, role)
                            values ('00000000-0000-4000-8000-000000000091',
                                '00000000-0000-4000-8000-000000000090', 'MASTER_PLAN');
                            """);
                }
                sql.execute(Files.readString(migration));
            }
        }
    }

    @AfterAll
    static void stopContainer() {
        if (database != null) {
            database.stop();
        }
    }

    @Test
    void legacyOrganizerRoleIsResetToLeastPrivilege() throws SQLException {
        try (Connection connection = connection(); Statement sql = connection.createStatement();
             var row = sql.executeQuery("""
                     select role::text from event_organizers
                     where event_id = '00000000-0000-4000-8000-000000000091'
                     """)) {
            assertTrue(row.next());
            assertEquals("MEMBER", row.getString(1));
        }
        try (Connection connection = connection(); Statement sql = connection.createStatement();
             var row = sql.executeQuery("select enum_range(null::event_role_enum)::text")) {
            assertTrue(row.next());
            assertEquals("{LEAD_HEADER,HR,PLAN,MEDIA,MEMBER}", row.getString(1));
        }
    }

    @Test
    void memberIdentityIsUniqueAndDeletingAuthUserPreservesMembership() throws SQLException {
        try (Connection connection = connection(); Statement sql = connection.createStatement()) {
            sql.execute("""
                    insert into auth.users (id, email, email_confirmed_at)
                    values ('00000000-0000-4000-8000-000000000001', 'Member@example.test', current_timestamp);
                    insert into club_members(student_id, full_name, email, batch, auth_user_id)
                    values ('SE000001', 'Test Member', 'Member@example.test', 'K20',
                        '00000000-0000-4000-8000-000000000001');
                    """);
            SQLException duplicate = assertThrows(SQLException.class, () -> sql.execute("""
                    insert into club_members(student_id, full_name, email, batch)
                    values ('SE000002', 'Other Member', 'member@example.test', 'K20')
                    """));
            assertEquals("23505", duplicate.getSQLState());
            sql.execute("delete from auth.users where id = '00000000-0000-4000-8000-000000000001'");
            try (var row = sql.executeQuery("select auth_user_id is null from club_members where student_id = 'SE000001'")) {
                assertTrue(row.next());
                assertTrue(row.getBoolean(1));
            }
        }
    }

    @Test
    void businessDataIsNotExposedToDataApiRoles() throws SQLException {
        try (Connection connection = connection(); Statement sql = connection.createStatement();
             var grants = sql.executeQuery("""
                     select has_table_privilege('anon', 'club_members', 'SELECT'),
                            has_table_privilege('authenticated', 'event_organizers', 'SELECT'),
                            has_table_privilege('authenticated', 'event_documents', 'SELECT'),
                            has_table_privilege('anon', 'v_event_budget_summary', 'SELECT'),
                            has_table_privilege('projectf_app', 'event_documents', 'SELECT')
                     """)) {
            assertTrue(grants.next());
            assertFalse(grants.getBoolean(1));
            assertFalse(grants.getBoolean(2));
            assertFalse(grants.getBoolean(3));
            assertFalse(grants.getBoolean(4));
            assertTrue(grants.getBoolean(5));
        }
    }

    @Test
    void backendRoleUsesScopedAuthFunctionsWithoutDirectAuthTableAccess() throws SQLException {
        try (Connection connection = connection(); Statement sql = connection.createStatement()) {
            sql.execute("""
                    insert into auth.users(id, email, email_confirmed_at)
                    values ('00000000-0000-4000-8000-000000000099', 'scoped@example.test', current_timestamp);
                    insert into club_members(student_id, full_name, email, batch)
                    values ('SE000099', 'Scoped Member', 'scoped@example.test', 'K20');
                    """);
            sql.execute("set role projectf_app");
            try (var row = sql.executeQuery(
                    "select projectf_private.find_confirmed_auth_user_id('scoped@example.test')")) {
                assertTrue(row.next());
                assertEquals("00000000-0000-4000-8000-000000000099", row.getString(1));
            }
            try (var row = sql.executeQuery("""
                    select projectf_private.claim_club_member_account(
                        '00000000-0000-4000-8000-000000000099', 'scoped@example.test')
                    """)) {
                assertTrue(row.next());
                assertEquals(1, row.getInt(1));
            }
            SQLException hidden = assertThrows(SQLException.class, () -> sql.executeQuery("select id from auth.users"));
            assertEquals("42501", hidden.getSQLState());
            SQLException denied = assertThrows(SQLException.class, () ->
                    sql.execute("update auth.users set email = 'changed@example.test' where false"));
            assertEquals("42501", denied.getSQLState());
        }
        try (Connection connection = connection(); Statement sql = connection.createStatement()) {
            sql.execute("set role authenticated");
            SQLException denied = assertThrows(SQLException.class, () ->
                    sql.executeQuery("select projectf_private.find_confirmed_auth_user_id('scoped@example.test')"));
            assertEquals("42501", denied.getSQLState());
        }
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }
}
