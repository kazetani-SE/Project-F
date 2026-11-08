import test from 'node:test';
import assert from 'node:assert/strict';
import {
    autoClassifyColumns,
    normalizeRatingScore,
    normalizeSourceType,
    transformRowsWithQuestionConfigs,
    parseNumericScore,
    isTrivialSuggestionAnswer,
    type QuestionColumnConfig,
} from '../src/utils/excelParser.ts';

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
    assert.equal(isTrivialSuggestionAnswer('Nên thêm bánh ngọt trong giờ giải lao'), false);
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
