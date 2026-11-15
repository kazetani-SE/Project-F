package com.projectf.features.member.dto.response;

import java.util.List;

public record MemberImportReport(int total, int created, int failed, int existingAuth,
                                 int emailFailed, List<MemberImportRow> rows) { }
