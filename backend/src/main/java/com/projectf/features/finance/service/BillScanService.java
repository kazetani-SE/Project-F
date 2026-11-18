package com.projectf.features.finance.service;

import org.springframework.web.multipart.MultipartFile;

import com.projectf.features.finance.dto.response.BillScanResponse;

public interface BillScanService {
    BillScanResponse scan(MultipartFile file);
}
