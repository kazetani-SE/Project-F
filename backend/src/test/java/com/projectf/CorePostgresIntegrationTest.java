package com.projectf;

import com.projectf.features.member.repository.ClubMemberRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnabledIf("postgresAvailable")
class CorePostgresIntegrationTest {
    private static final String ADMIN = "00000000-0000-4000-8000-000000000001";
    private static final String MEMBER = "00000000-0000-4000-8000-000000000002";
    private static final String SERIES = "00000000-0000-4000-8000-000000000010";
    // The optional URL must point to an empty, disposable database.
    private static final String LOCAL_URL = System.getenv("PROJECTF_TEST_POSTGRES_URL");
    private static PostgreSQLContainer<?> database;

    @Autowired private MockMvc mvc;
    @Autowired private ClubMemberRepository members;

    static boolean postgresAvailable() {
        return LOCAL_URL != null || DockerClientFactory.instance().isDockerAvailable();
    }

    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) throws Exception {
        String url = LOCAL_URL;
        String username = System.getenv().getOrDefault("PROJECTF_TEST_POSTGRES_USER", "postgres");
        String password = System.getenv().getOrDefault("PROJECTF_TEST_POSTGRES_PASSWORD", "");
        if (url == null) {
            database = new PostgreSQLContainer<>("postgres:17");
            database.start();
            url = database.getJdbcUrl();
            username = database.getUsername();
            password = database.getPassword();
        }
        migrate(url, username, password);
        String jdbcUrl = url;
        String jdbcUser = username;
        String jdbcPassword = password;
        registry.add("spring.autoconfigure.exclude", () -> "");
        registry.add("spring.datasource.url", () -> jdbcUrl);
        registry.add("spring.datasource.username", () -> jdbcUser);
        registry.add("spring.datasource.password", () -> jdbcPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
        registry.add("spring.jpa.open-in-view", () -> false);
    }

    @AfterAll
    static void stopContainer() {
        if (database != null) {
            database.stop();
        }
    }

    @Test
    void membersApplyAllFiltersBeforeCountingAndPaging() throws Exception {
        mvc.perform(get("/v1/members").with(jwt().jwt(token -> token.subject(ADMIN)))
                .param("page", "1").param("size", "1").param("sort", "fullName,asc")
                .param("keyword", "VOLUNTEER").param("department", "HR").param("role", "MEMBER")
                .param("batch", "K20").param("isActive", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.items[0].fullName").value("Second Volunteer"));
    }

    @Test
    void memberSeesOnlyAssignedSeasonsAcrossBothCollections() throws Exception {
        var member = jwt().jwt(token -> token.subject(MEMBER));
        mvc.perform(get("/v1/events").with(member).param("seriesId", SERIES).param("status", "APPROVED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.items[0].title").value("Assigned"));
        mvc.perform(get("/v1/event-series/{id}", SERIES).with(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.events.length()").value(1))
                .andExpect(jsonPath("$.data.events[0].title").value("Assigned"));
    }

    @Test
    void nativeClaimRequiresMatchingConfirmedEmailAndOnlyClaimsOnce() {
        UUID verified = UUID.fromString("00000000-0000-4000-8000-000000000003");
        UUID unconfirmed = UUID.fromString("00000000-0000-4000-8000-000000000004");
        UUID mismatch = UUID.fromString("00000000-0000-4000-8000-000000000005");

        assertEquals(0, members.claimAccount(unconfirmed, "two@example.test"));
        assertEquals(0, members.claimAccount(mismatch, "two@example.test"));
        assertEquals(1, members.claimAccount(verified, "tWo@EXAMPLE.test"));
        assertEquals(0, members.claimAccount(verified, "two@example.test"));
        assertEquals("SE000003", members.findByAuthUserId(verified).orElseThrow().getStudentId());
    }

    @Test
    void newEventIncludesDefaultsAndGeneratedTimestamps() throws Exception {
        mvc.perform(post("/v1/events").with(jwt().jwt(token -> token.subject(ADMIN)))
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"seasonName":"2027","title":"New Season","expectedStartDate":"2027-02-01",
                        "expectedEndDate":"2027-02-02"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PLANNING"))
                .andExpect(jsonPath("$.data.allocatedFund").value(0))
                .andExpect(jsonPath("$.data.createdAt").isString())
                .andExpect(jsonPath("$.data.updatedAt").isString());
    }

    private static void migrate(String url, String username, String password) throws Exception {
        try (var connection = DriverManager.getConnection(url, username, password);
             var sql = connection.createStatement();
             var files = Files.list(Path.of("..", "supabase", "migrations"))) {
            sql.execute("""
                    do $$
                    begin
                        if to_regclass('public.club_members') is not null or to_regnamespace('auth') is not null then
                            raise exception 'Core integration tests require an empty database';
                        end if;
                        if not exists (select from pg_roles where rolname = 'anon') then
                            create role anon;
                        end if;
                        if not exists (select from pg_roles where rolname = 'authenticated') then
                            create role authenticated;
                        end if;
                    end
                    $$;
                    create schema auth;
                    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
                    """);
            for (Path migration : files.filter(path -> path.toString().endsWith(".sql")).sorted().toList()) {
                sql.execute(Files.readString(migration));
            }
            sql.execute("""
                    insert into auth.users(id) values
                        ('00000000-0000-4000-8000-000000000001'),
                        ('00000000-0000-4000-8000-000000000002');
                    insert into auth.users(id, email, email_confirmed_at) values
                        ('00000000-0000-4000-8000-000000000003','Two@example.test',current_timestamp),
                        ('00000000-0000-4000-8000-000000000004','two@example.test',null),
                        ('00000000-0000-4000-8000-000000000005','other@example.test',current_timestamp);
                    insert into club_members(id,student_id,full_name,email,department,club_role,batch,is_active,auth_user_id) values
                        ('00000000-0000-4000-8000-000000000021','SE000001','President','admin@example.test','PLAN',
                            'PRESIDENT','K20',true,'00000000-0000-4000-8000-000000000001'),
                        ('00000000-0000-4000-8000-000000000022','SE000002','First Volunteer','one@example.test','HR',
                            'MEMBER','K20',true,'00000000-0000-4000-8000-000000000002'),
                        (gen_random_uuid(),'SE000003','Second Volunteer','two@example.test','HR','MEMBER','K20',true,null),
                        (gen_random_uuid(),'SE000004','Former Volunteer','three@example.test','HR','MEMBER','K20',false,null),
                        (gen_random_uuid(),'SE000005','Plan Volunteer','four@example.test','PLAN','MEMBER','K20',true,null),
                        (gen_random_uuid(),'SE000006','New Volunteer','five@example.test','HR','MEMBER','K21',true,null),
                        (gen_random_uuid(),'SE000007','Lead Volunteer','six@example.test','HR','VICEPRESIDENT','K20',true,null);
                    insert into event_series (id, name) values ('00000000-0000-4000-8000-000000000010', 'Annual');
                    insert into events(id,series_id,season_name,title,expected_start_date,expected_end_date,status) values
                        ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000010',
                            '2025','Assigned','2025-01-01','2025-01-02','APPROVED'),
                        (gen_random_uuid(),'00000000-0000-4000-8000-000000000010',
                            '2026','Unassigned','2026-01-01','2026-01-02','APPROVED');
                    insert into event_organizers(event_id,member_id,role) values
                        ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000022','MASTER_PLAN');
                    """);
        }
    }
}
