package com.projectf;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class TaskOneSecurityScopeTest extends ProjectFApplicationTests {
    @Autowired
    private MockMvc mvc;

    @Test
    void devStillRequiresJwtForTaskOne() throws Exception {
        mvc.perform(get("/v1/members")).andExpect(status().isUnauthorized());
    }

    @Test
    void sliceTwoWriteReachesItsControllerInDev() throws Exception {
        mvc.perform(post("/v1/finance/categories")).andExpect(status().isBadRequest());
    }

    @Test
    void sliceThreeNestedRouteKeepsItsOwnAccessPolicyInDev() throws Exception {
        mvc.perform(get("/v1/events/{eventId}/documents", "00000000-0000-4000-8000-000000000001"))
                .andExpect(status().isOk());
    }
}
