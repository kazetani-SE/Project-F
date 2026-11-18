package com.projectf;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.GenerateContentConfig;
import com.projectf.features.finance.dto.request.BenchmarkAiResearchRequest;
import com.projectf.features.finance.dto.response.BenchmarkAiSuggestionResponse;
import com.projectf.features.finance.dto.response.BillScanResponse;
import com.projectf.features.finance.service.impl.BenchmarkAiResearchServiceImpl;
import com.projectf.features.finance.service.impl.BillScanServiceImpl;
import com.projectf.features.finance.service.support.BenchmarkAiResearchRouter;
import com.projectf.features.finance.service.support.BenchmarkCacheStore;
import com.projectf.features.finance.service.support.GeminiGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Test phần AI của finance: cache giá, router chuyển mode, quét bill.
 * Không gọi Gemini, không cần API key, không khởi động Spring.
 */
class FinanceAiTest {

    private static final String CACHE_JSON = """
            [
              {"itemName":"Thuê sân bóng đá mini 5 người","unit":"giờ","estUnitPrice":230000,
               "supplierName":"Từ cache","supplierLink":"https://cache.vn","referenceNote":"cache"},
              {"itemName":"Áo thun đồng phục CLB","unit":"cái","estUnitPrice":85000,
               "supplierName":"Shop B","supplierLink":"https://b.vn","referenceNote":"note B"}
            ]
            """;

    private static BenchmarkCacheStore storeFrom(String json) {
        return new BenchmarkCacheStore(
                new ObjectMapper(),
                new ByteArrayResource(json.getBytes(StandardCharsets.UTF_8)));
    }

    // ========================================================================
    // 1. CACHE
    // ========================================================================
    @Nested
    class CacheStoreTests {

        @Test
        void khopChinhXacTenVaDonVi() {
            var store = storeFrom(CACHE_JSON);

            assertTrue(store.find("Thuê sân bóng đá mini 5 người", "giờ").isPresent());
            assertTrue(store.find("Áo thun đồng phục CLB", "cái").isPresent());
        }

        @Test
        void khongPhanBietDauHoaThuongVaKhoangTrang() {
            var store = storeFrom(CACHE_JSON);
            var exact = store.find("Thuê sân bóng đá mini 5 người", "giờ").orElseThrow();

            assertSame(exact, store.find("THUE SAN BONG DA MINI 5 NGUOI", "gio").orElseThrow());
            assertSame(exact, store.find("  Thuê   sân bóng đá mini 5 người  ", "GIỜ").orElseThrow());
        }

        @Test
        void saiDonVi_vanKhopTheoTen() {
            var store = storeFrom(CACHE_JSON);
            var exact = store.find("Thuê sân bóng đá mini 5 người", "giờ").orElseThrow();

            assertSame(exact, store.find("Thuê sân bóng đá mini 5 người", "ngày").orElseThrow());
        }

        @Test
        void monKhongTonTai_traVeRong() {
            assertTrue(storeFrom(CACHE_JSON).find("Món không tồn tại", "cái").isEmpty());
        }

        @Test
        void fileRong_khongLoi() {
            assertTrue(storeFrom("[]").find("Thuê sân bóng đá mini 5 người", "giờ").isEmpty());
        }

        @Test
        void phanTuThieuItemName_biBoQua_khongLamHongCaFile() {
            var store = storeFrom("""
                    [
                      {"unit":"giờ"},
                      {"itemName":"Áo thun đồng phục CLB","unit":"cái","estUnitPrice":85000,
                       "supplierName":"Shop B","supplierLink":"https://b.vn","referenceNote":"note B"}
                    ]
                    """);

            assertTrue(store.find("Áo thun đồng phục CLB", "cái").isPresent());
        }

        @Test
        void fileKhongTonTai_appVanKhoiDongDuoc() {
            var store = new BenchmarkCacheStore(
                    new ObjectMapper(), new ClassPathResource("khong-co-file.json"));

            assertTrue(store.find("bất kỳ", "bất kỳ").isEmpty());
        }
    }

    // ========================================================================
    // 2. ROUTER (cache / live / auto)
    // ========================================================================
    @Nested
    @ExtendWith(MockitoExtension.class)
    class RouterTests {

        private static final String LIVE_JSON = """
                {"itemName":"Thuê sân bóng đá mini 5 người","unit":"giờ","estUnitPrice":999000,
                 "supplierName":"Từ AI live","supplierLink":"https://live.vn","referenceNote":"live"}
                """;

        @Mock
        BenchmarkAiResearchServiceImpl liveService;

        BenchmarkCacheStore cacheStore;
        BenchmarkAiSuggestionResponse cached;
        BenchmarkAiSuggestionResponse live;

        final BenchmarkAiResearchRequest hit = new BenchmarkAiResearchRequest("Thuê sân bóng đá mini 5 người", "giờ",
                "TP.HCM");
        final BenchmarkAiResearchRequest miss = new BenchmarkAiResearchRequest("Món lạ không có trong cache", "cái",
                "TP.HCM");

        @BeforeEach
        void setUp() throws Exception {
            cacheStore = storeFrom(CACHE_JSON);
            cached = cacheStore.find(hit.itemName(), hit.unit()).orElseThrow();
            live = new ObjectMapper().readValue(LIVE_JSON, BenchmarkAiSuggestionResponse.class);
        }

        private BenchmarkAiResearchRouter routerWithMode(String mode) {
            var router = new BenchmarkAiResearchRouter(liveService, cacheStore);
            ReflectionTestUtils.setField(router, "modeConfig", mode);
            ReflectionTestUtils.invokeMethod(router, "init");
            return router;
        }

        @Test
        void cacheMode_traVeCache_vaKhongGoiLive() {
            assertSame(cached, routerWithMode("cache").researchMarketBenchmark(hit));
            verifyNoInteractions(liveService);
        }

        @Test
        void cacheMode_khongCoTrongCache_nemLoi() {
            var router = routerWithMode("cache");

            assertThrows(IllegalStateException.class, () -> router.researchMarketBenchmark(miss));
            verifyNoInteractions(liveService);
        }

        @Test
        void liveMode_goiLive() {
            when(liveService.researchMarketBenchmark(hit)).thenReturn(live);

            assertSame(live, routerWithMode("live").researchMarketBenchmark(hit));
        }

        @Test
        void liveMode_liveLoi_nemLoiRaNgoai_khongRoiVeCache() {
            when(liveService.researchMarketBenchmark(hit)).thenThrow(new IllegalStateException("429"));
            var router = routerWithMode("live");

            assertThrows(IllegalStateException.class, () -> router.researchMarketBenchmark(hit));
        }

        @Test
        void autoMode_liveOk_dungKetQuaLive() {
            when(liveService.researchMarketBenchmark(hit)).thenReturn(live);

            assertSame(live, routerWithMode("auto").researchMarketBenchmark(hit));
        }

        @Test
        void autoMode_liveLoi_roiVeCache() {
            when(liveService.researchMarketBenchmark(hit)).thenThrow(new IllegalStateException("429"));

            assertSame(cached, routerWithMode("auto").researchMarketBenchmark(hit));
        }

        @Test
        void autoMode_liveLoi_vaCacheKhongCo_nemLaiLoiGoc() {
            var original = new IllegalStateException("429");
            when(liveService.researchMarketBenchmark(miss)).thenThrow(original);
            var router = routerWithMode("auto");

            var thrown = assertThrows(IllegalStateException.class,
                    () -> router.researchMarketBenchmark(miss));
            assertSame(original, thrown);
        }

        @Test
        void modeKhongHopLe_macDinhLaCache() {
            var router = routerWithMode("lve");

            assertSame(cached, router.researchMarketBenchmark(hit));
            verifyNoInteractions(liveService);
        }
    }

    // ========================================================================
    // 3. QUÉT BILL
    // ========================================================================
    @Nested
    @ExtendWith(MockitoExtension.class)
    class BillScanTests {

        private static final String BILL_JSON = """
                {"storeName":"Highlands","billDate":"2026-11-18","totalAmount":125000,
                 "items":[{"name":"Trà đào","quantity":2,"unitPrice":50000,"amount":100000}]}
                """;

        @Mock
        GeminiGateway gemini;

        BillScanServiceImpl service;

        @BeforeEach
        void setUp() {
            service = new BillScanServiceImpl(gemini, new ObjectMapper());
        }

        private MockMultipartFile file(String contentType, byte[] content) {
            return new MockMultipartFile("file", "bill", contentType, content);
        }

        @Test
        void fileRong_biTuChoi() {
            var f = file("image/jpeg", new byte[0]);

            assertThrows(IllegalArgumentException.class, () -> service.scan(f));
            verifyNoInteractions(gemini);
        }

        @Test
        void fileQuaLon_biTuChoi() {
            var f = file("image/jpeg", new byte[10 * 1024 * 1024 + 1]);

            assertThrows(IllegalArgumentException.class, () -> service.scan(f));
            verifyNoInteractions(gemini);
        }

        @Test
        void loaiFileKhongHoTro_biTuChoi() {
            var f = file("text/plain", "abc".getBytes());

            assertThrows(IllegalArgumentException.class, () -> service.scan(f));
            verifyNoInteractions(gemini);
        }

        @Test
        void khongCoContentType_biTuChoi() {
            var f = file(null, "abc".getBytes());

            assertThrows(IllegalArgumentException.class, () -> service.scan(f));
            verifyNoInteractions(gemini);
        }

        @Test
        void imageJpg_duocDoiThanhImageJpeg_truocKhiGui() {
            when(gemini.generateWithImage(anyString(), any(byte[].class), eq("image/jpeg"),
                    any(GenerateContentConfig.class))).thenReturn(BILL_JSON);

            BillScanResponse r = service.scan(file("image/jpg", "abc".getBytes()));

            assertEquals("Highlands", r.storeName());
            verify(gemini).generateWithImage(anyString(), any(byte[].class), eq("image/jpeg"),
                    any(GenerateContentConfig.class));
        }

        @Test
        void modelTraVeJsonBocTrongMarkdown_vanParseDuoc() {
            when(gemini.generateWithImage(anyString(), any(byte[].class), anyString(),
                    any(GenerateContentConfig.class))).thenReturn("```json\n" + BILL_JSON + "\n```");

            BillScanResponse r = service.scan(file("image/png", "abc".getBytes()));

            assertEquals("Highlands", r.storeName());
            assertEquals(125000L, r.totalAmount());
            assertEquals(1, r.items().size());
        }

        @Test
        void pdf_duocChapNhan() {
            when(gemini.generateWithImage(anyString(), any(byte[].class), eq("application/pdf"),
                    any(GenerateContentConfig.class))).thenReturn(BILL_JSON);

            assertEquals("Highlands",
                    service.scan(file("application/pdf", "abc".getBytes())).storeName());
        }

        @Test
        void modelTraVeKhongPhaiJson_nemIllegalState() {
            when(gemini.generateWithImage(anyString(), any(byte[].class), anyString(),
                    any(GenerateContentConfig.class))).thenReturn("Xin lỗi, tôi không đọc được hóa đơn.");

            assertThrows(IllegalStateException.class,
                    () -> service.scan(file("image/jpeg", "abc".getBytes())));
        }
    }
}