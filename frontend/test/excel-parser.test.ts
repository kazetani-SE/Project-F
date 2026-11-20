import test from 'node:test';
import assert from 'node:assert/strict';
import {
    autoClassifyColumns,
    normalizeRatingScore,
    normalizeSourceType,
    transformRowsWithQuestionConfigs,
    parseNumericScore,
    isTrivialSuggestionAnswer,
    classifySuggestionQuestionType,
    extractStructuredFeedback,
    resolveSpreadsheetExportUrl,
    type QuestionColumnConfig,
} from '../src/utils/excelParser.ts';
import type { FeedbackResponse } from '../src/types/models/knowledge.ts';

test('autoClassifyColumns classifies columns accurately from typical form headers and rows', () => {
    const headers = [
        'Dấu thời gian',
        'Email',
        'Bạn tham gia với vai trò nào?',
        'Bạn đánh giá mức độ hài lòng về sự kiện (1-5 sao)?',
        'Điều bạn thích nhất tại sự kiện?',
        'Góp ý cải thiện cho ban tổ chức?',
    ];

    const rawRows = [
        {
            'Dấu thời gian': '2026-10-05 10:00:00',
            'Email': 'student1@fpt.edu.vn',
            'Bạn tham gia với vai trò nào?': 'Người tham dự',
            'Bạn đánh giá mức độ hài lòng về sự kiện (1-5 sao)?': 5,
            'Điều bạn thích nhất tại sự kiện?': 'Workshop CI/CD rất hay',
            'Góp ý cải thiện cho ban tổ chức?': 'Bổ sung thêm ổ cắm điện',
        },
    ];

    const configs = autoClassifyColumns(headers, rawRows);

    const timeCol = configs.find((c) => c.rawHeader === 'Dấu thời gian');
    const roleCol = configs.find((c) => c.rawHeader === 'Bạn tham gia với vai trò nào?');
    const ratingCol = configs.find((c) => c.rawHeader === 'Bạn đánh giá mức độ hài lòng về sự kiện (1-5 sao)?');
    const suggestionCol = configs.find((c) => c.rawHeader === 'Góp ý cải thiện cho ban tổ chức?');

    assert.equal(timeCol?.role, 'IGNORE');
    assert.equal(roleCol?.role, 'METADATA');
    assert.equal(ratingCol?.role, 'RATING');
    assert.equal(suggestionCol?.role, 'SUGGESTION');
});

test('normalizeRatingScore handles numbers, stars, text and limits to 1..5', () => {
    assert.equal(normalizeRatingScore(5), 5);
    assert.equal(normalizeRatingScore(1), 1);
    assert.equal(normalizeRatingScore(6), 5); // Max 5
    assert.equal(normalizeRatingScore(0), 1); // Min 1

    assert.equal(normalizeRatingScore('5'), 5);
    assert.equal(normalizeRatingScore('4/5 sao'), 4);
    assert.equal(normalizeRatingScore('Rất hài lòng'), 5);
    assert.equal(normalizeRatingScore('Hài lòng'), 4);
    assert.equal(normalizeRatingScore('Bình thường'), 3);
    assert.equal(normalizeRatingScore('Không hài lòng'), 2);
    assert.equal(normalizeRatingScore('Rất không hài lòng'), 1);
});

test('parseNumericScore extracts scores correctly', () => {
    assert.equal(parseNumericScore(5, 5), 5);
    assert.equal(parseNumericScore('4/5', 5), 4);
    assert.equal(parseNumericScore('10', 10), 10);
    assert.equal(parseNumericScore(null, 5), null);
});

test('isTrivialSuggestionAnswer identifies non-informative answers', () => {
    assert.equal(isTrivialSuggestionAnswer('Không có'), true);
    assert.equal(isTrivialSuggestionAnswer('không'), true);
    assert.equal(isTrivialSuggestionAnswer('none'), true);
    assert.equal(isTrivialSuggestionAnswer('Dạ không, quá hoàn hảo'), true);
    assert.equal(isTrivialSuggestionAnswer('Tuyệt vời'), true);
    assert.equal(isTrivialSuggestionAnswer('Nên thêm bánh ngọt trong giờ giải lao'), false);
});

test('classifySuggestionQuestionType distinguishes self-reflection from BTC improvement and highlight questions', () => {
    assert.equal(
        classifySuggestionQuestionType('Bạn nghĩ bản thân cần cải thiện gì sau cuộc thi?'),
        'SELF_OR_OTHER',
    );
    assert.equal(
        classifySuggestionQuestionType('Bạn cần cải thiện gì để làm bài tốt hơn?'),
        'SELF_OR_OTHER',
    );
    assert.equal(
        classifySuggestionQuestionType('Góp ý cải thiện cho ban tổ chức?'),
        'IMPROVEMENT',
    );
    assert.equal(
        classifySuggestionQuestionType('Bạn có gặp khó khăn gì trong quá trình thi không?'),
        'IMPROVEMENT',
    );
    assert.equal(
        classifySuggestionQuestionType('Điều bạn thích nhất tại sự kiện?'),
        'HIGHLIGHT',
    );
});

test('normalizeSourceType maps organizer, sponsor, speaker and attendee correctly', () => {
    assert.equal(normalizeSourceType('Ban tổ chức'), 'ORGANIZER');
    assert.equal(normalizeSourceType('BTC nội bộ'), 'ORGANIZER');
    assert.equal(normalizeSourceType('Nhà tài trợ vàng'), 'SPONSOR');
    assert.equal(normalizeSourceType('Diễn giả chính'), 'SPEAKER');
    assert.equal(normalizeSourceType('Sinh viên tham gia'), 'ATTENDEE');
    assert.equal(normalizeSourceType(null), 'ATTENDEE');
});

test('transformRowsWithQuestionConfigs transforms rows and packs questions into customResponses', () => {
    const rawRows = [
        {
            'Email': 'student1@fpt.edu.vn',
            'Vai trò': 'Người tham dự',
            'Đánh giá chung': 5,
            'Góp ý': 'Hội trường hơi lạnh',
        },
        {
            'Email': 'sponsor@partner.com',
            'Vai trò': 'Nhà tài trợ',
            'Đánh giá chung': '4 sao',
            'Góp ý': 'Cần thêm thời gian giao lưu',
        },
        {
            // Empty row that should be ignored
            'Email': '',
            'Vai trò': '',
            'Đánh giá chung': '',
            'Góp ý': '',
        },
    ];

    const columnConfigs: QuestionColumnConfig[] = [
        {
            rawHeader: 'Email',
            questionLabel: 'Email',
            role: 'METADATA',
            scaleMax: 5,
            sampleValues: [],
        },
        {
            rawHeader: 'Vai trò',
            questionLabel: 'Vai trò',
            role: 'METADATA',
            scaleMax: 5,
            sampleValues: [],
        },
        {
            rawHeader: 'Đánh giá chung',
            questionLabel: 'Đánh giá chung',
            role: 'RATING',
            scaleMax: 5,
            sampleValues: [],
        },
        {
            rawHeader: 'Góp ý',
            questionLabel: 'Góp ý',
            role: 'SUGGESTION',
            scaleMax: 5,
            sampleValues: [],
        },
    ];

    const s3Url = 'https://bucket.s3.amazonaws.com/feedbacks/khao_sat.xlsx';
    const result = transformRowsWithQuestionConfigs(rawRows, columnConfigs, s3Url, 'ATTENDEE');

    assert.equal(result.length, 2);

    // Row 1
    assert.equal(result[0].sourceType, 'ATTENDEE');
    assert.equal(result[0].ratingScore, 5);
    assert.equal(result[0].fileUrl, s3Url);

    // Row 2
    assert.equal(result[1].sourceType, 'ATTENDEE');
    assert.equal(result[1].ratingScore, 4);
    assert.equal(result[1].fileUrl, s3Url);
});

test('transformRowsWithQuestionConfigs attaches batch metadata options and extractStructuredFeedback preserves highlightContent/improvementContent', () => {
    const rawRows = [
        {
            'Chất lượng nội dung': 4,
            'Sẽ quay lại mùa sau': 'Có',
        },
    ];
    const columnConfigs: QuestionColumnConfig[] = [
        {
            rawHeader: 'Chất lượng nội dung',
            questionLabel: 'Chất lượng nội dung',
            role: 'RATING',
            scaleMax: 5,
            sampleValues: [],
        },
        {
            rawHeader: 'Sẽ quay lại mùa sau',
            questionLabel: 'Sẽ quay lại mùa sau',
            role: 'METADATA',
            scaleMax: 5,
            sampleValues: [],
        },
    ];

    const result = transformRowsWithQuestionConfigs(
        rawRows,
        columnConfigs,
        'https://bucket.s3.amazonaws.com/feedbacks/ori-26.xlsx',
        'ATTENDEE',
        {
            formTitle: 'Khảo sát người tham dự · Orientation Day K21',
            formPlatform: 'Google Forms',
            importedBy: 'Lê Hoàng',
            skippedRows: 1,
        },
    );

    assert.equal(result.length, 1);
    assert.equal(
        result[0].customResponses?._formTitle,
        'Khảo sát người tham dự · Orientation Day K21',
    );
    assert.equal(result[0].customResponses?._formPlatform, 'Google Forms');
    assert.equal(result[0].customResponses?._importedBy, 'Lê Hoàng');
    assert.equal(result[0].customResponses?._skippedRows, 1);

    // Legacy record with both customResponses keys and highlightContent/improvementContent
    const legacyRecord: FeedbackResponse = {
        id: 'fb-legacy-1',
        eventId: 'ev-tech-fall-2026',
        sourceType: 'ATTENDEE',
        fileUrl: 'https://bucket.s3.amazonaws.com/feedbacks/legacy.xlsx',
        ratingScore: 5,
        highlightContent: 'Nội dung workshop thực tế',
        improvementContent: 'Thời gian nghỉ hơi ngắn',
        customResponses: {
            favoriteSession: 'CI/CD Workshop',
            networkingScore: 4,
        },
        submittedAt: '2026-08-30T17:00:00Z',
    };

    const extracted = extractStructuredFeedback(legacyRecord);
    assert.equal(
        extracted.suggestions.some((s) => s.answer === 'Nội dung workshop thực tế'),
        true,
    );
    assert.equal(
        extracted.suggestions.some((s) => s.answer === 'Thời gian nghỉ hơi ngắn'),
        true,
    );
});

test('resolveSpreadsheetExportUrl converts Google Sheets and OneDrive URLs and blocks public viewform links', () => {
    const gsheet = resolveSpreadsheetExportUrl(
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=12345',
    );
    assert.equal(
        gsheet.exportUrl,
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=xlsx&gid=12345',
    );
    assert.equal(gsheet.platform, 'Google Forms');
    assert.equal(gsheet.spreadsheetId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

    const onedrive = resolveSpreadsheetExportUrl(
        'https://onedrive.live.com/edit.aspx?resid=ABC12345',
    );
    assert.equal(
        onedrive.exportUrl,
        'https://onedrive.live.com/edit.aspx?resid=ABC12345&download=1',
    );
    assert.equal(onedrive.platform, 'Microsoft Forms');

    assert.throws(
        () => resolveSpreadsheetExportUrl('https://forms.gle/xyz123'),
        /Đây là link điền Form công khai/,
    );
});
