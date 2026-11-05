import test from 'node:test';
import assert from 'node:assert/strict';
import {
    autoDetectFeedbackMapping,
    normalizeRatingScore,
    normalizeSourceType,
    transformRowsToFeedbackRequests,
} from '../src/utils/excelParser.ts';

test('autoDetectFeedbackMapping detects columns accurately from typical form headers', () => {
    const headers = [
        'Dấu thời gian',
        'Email',
        'Bạn tham gia với vai trò nào?',
        'Bạn đánh giá mức độ hài lòng về sự kiện (1-5 sao)?',
        'Điều bạn thích nhất tại sự kiện?',
        'Góp ý cải thiện cho ban tổ chức?',
    ];

    const mapping = autoDetectFeedbackMapping(headers);

    assert.equal(mapping.sourceTypeColumn, 'Bạn tham gia với vai trò nào?');
    assert.equal(mapping.ratingScoreColumn, 'Bạn đánh giá mức độ hài lòng về sự kiện (1-5 sao)?');
    assert.equal(mapping.highlightContentColumn, 'Điều bạn thích nhất tại sự kiện?');
    assert.equal(mapping.improvementContentColumn, 'Góp ý cải thiện cho ban tổ chức?');
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

test('normalizeSourceType maps organizer, sponsor, speaker and attendee correctly', () => {
    assert.equal(normalizeSourceType('Ban tổ chức'), 'ORGANIZER');
    assert.equal(normalizeSourceType('BTC nội bộ'), 'ORGANIZER');
    assert.equal(normalizeSourceType('Nhà tài trợ vàng'), 'SPONSOR');
    assert.equal(normalizeSourceType('Diễn giả chính'), 'SPEAKER');
    assert.equal(normalizeSourceType('Sinh viên tham gia'), 'ATTENDEE');
    assert.equal(normalizeSourceType(null), 'ATTENDEE');
});

test('transformRowsToFeedbackRequests transforms rows and packs non-mapped columns into customResponses', () => {
    const rawRows = [
        {
            'Email': 'student1@fpt.edu.vn',
            'Vai trò': 'Người tham dự',
            'Đánh giá': 5,
            'Điểm sáng': 'Workshop AI rất bổ ích',
            'Cần cải thiện': 'Hội trường hơi lạnh',
            'Số điện thoại': '0912345678',
            'Bạn biết sự kiện qua đâu': 'Fanpage CLB',
        },
        {
            'Email': 'sponsor@partner.com',
            'Vai trò': 'Nhà tài trợ',
            'Đánh giá': '4 sao',
            'Điểm sáng': 'Hỗ trợ chu đáo',
            'Cần cải thiện': 'Cần thời lượng kết nối doanh nghiệp dài hơn',
            'Số điện thoại': '0987654321',
            'Bạn biết sự kiện qua đâu': 'Thư mời',
        },
        {
            // Empty row that should be ignored
            'Email': '',
            'Vai trò': '',
            'Đánh giá': '',
            'Điểm sáng': '',
            'Cần cải thiện': '',
        },
    ];

    const mapping = {
        sourceTypeColumn: 'Vai trò',
        ratingScoreColumn: 'Đánh giá',
        highlightContentColumn: 'Điểm sáng',
        improvementContentColumn: 'Cần cải thiện',
    };

    const s3Url = 'https://bucket.s3.amazonaws.com/feedbacks/khao_sat.xlsx';
    const result = transformRowsToFeedbackRequests(rawRows, mapping, s3Url);

    assert.equal(result.length, 2);

    // Row 1
    assert.equal(result[0].sourceType, 'ATTENDEE');
    assert.equal(result[0].ratingScore, 5);
    assert.equal(result[0].highlightContent, 'Workshop AI rất bổ ích');
    assert.equal(result[0].improvementContent, 'Hội trường hơi lạnh');
    assert.equal(result[0].fileUrl, s3Url);
    assert.equal(result[0].customResponses?.['Email'], 'student1@fpt.edu.vn');
    assert.equal(result[0].customResponses?.['Số điện thoại'], '0912345678');
    assert.equal(result[0].customResponses?.['Bạn biết sự kiện qua đâu'], 'Fanpage CLB');

    // Row 2
    assert.equal(result[1].sourceType, 'SPONSOR');
    assert.equal(result[1].ratingScore, 4);
    assert.equal(result[1].highlightContent, 'Hỗ trợ chu đáo');
    assert.equal(result[1].improvementContent, 'Cần thời lượng kết nối doanh nghiệp dài hơn');
    assert.equal(result[1].fileUrl, s3Url);
    assert.equal(result[1].customResponses?.['Email'], 'sponsor@partner.com');
});
