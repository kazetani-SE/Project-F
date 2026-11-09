package com.projectf;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers(disabledWithoutDocker = true)
class SupabaseMigrationTest {
    @Container
    private static final PostgreSQLContainer<?> DATABASE = new PostgreSQLContainer<>("postgres:17");

    @BeforeAll
    static void migrate() throws Exception {
        try (Connection connection = connection(); Statement sql = connection.createStatement();
             var files = Files.list(Path.of("..", "supabase", "migrations"))) {
            sql.execute("""
                    create role anon;
                    create role authenticated;
                    create schema auth;
                    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
                    alter default privileges grant all on tables to anon, authenticated;
                    """);
            for (Path migration : files.filter(path -> path.toString().endsWith(".sql")).sorted().toList()) {
                sql.execute(Files.readString(migration));
            }
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
    void revokesOnlyTaskOneDataApiGrants() throws SQLException {
        try (Connection connection = connection(); Statement sql = connection.createStatement();
             var grants = sql.executeQuery("""
                     select has_table_privilege('anon', 'club_members', 'SELECT'),
                            has_table_privilege('authenticated', 'event_organizers', 'SELECT'),
                            has_table_privilege('authenticated', 'event_documents', 'SELECT')
                     """)) {
            assertTrue(grants.next());
            assertFalse(grants.getBoolean(1));
            assertFalse(grants.getBoolean(2));
            assertTrue(grants.getBoolean(3));
        }
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(DATABASE.getJdbcUrl(), DATABASE.getUsername(), DATABASE.getPassword());
    }
}
