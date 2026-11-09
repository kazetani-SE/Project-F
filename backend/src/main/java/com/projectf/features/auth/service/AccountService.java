package com.projectf.features.auth.service;

import com.projectf.features.auth.dto.response.AccountResponse;
import org.springframework.security.oauth2.jwt.Jwt;

@FunctionalInterface
public interface AccountService {
    AccountResponse resolve(Jwt jwt);
}
