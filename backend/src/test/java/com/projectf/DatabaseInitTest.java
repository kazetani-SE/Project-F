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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@EnabledIf("postgresAvailable")
class DatabaseInitTest {
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
        try (Connection connection = connection(); Statement sql = connection.createStatement()) {
            sql.execute(Files.readString(Path.of("..", "database", "init_database.sql")));
        }
    }

    @AfterAll
    static void stopContainer() {
        if (database != null) {
            database.stop();
        }
    }

    @Test
    void seededDatabaseSupportsRuntimeRoleAndRepeatedSeed() throws Exception {
        try (Connection connection = connection(); Statement sql = connection.createStatement()) {
            String seed = Files.readString(Path.of("..", "database", "seed.sql"));
            sql.execute(seed);
            sql.execute(seed);
            sql.execute("set role projectf_app");
            try (var row = sql.executeQuery("select count(*) from v_event_budget_summary")) {
                assertTrue(row.next());
                assertTrue(row.getInt(1) > 0);
            }
            try (var row = sql.executeQuery("select enum_range(null::event_role_enum)::text")) {
                assertTrue(row.next());
                assertEquals("{LEAD_HEADER,HR,PLAN,MEDIA,MEMBER}", row.getString(1));
            }
            SQLException denied = assertThrows(SQLException.class, () -> sql.execute("drop table event_feedbacks"));
            assertEquals("42501", denied.getSQLState());
        }
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }
}
