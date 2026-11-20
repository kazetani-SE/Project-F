import test from 'node:test';
import assert from 'node:assert/strict';
import {
    detectFaqColumns,
    transformExcelRows,
    toCreateFaqRequest,
    type FaqColumnMapping,
    type ParsedFaqItem,
} from '../src/utils/faqParser.ts';

test('detectFaqColumns correctly identifies Vietnamese and English FAQ columns', () => {
    const vietnameseHeaders = ['STT', 'Câu hỏi thường gặp', 'Câu trả lời chi tiết', 'Danh mục phân loại', 'Ghim'];
    const detectedVi = detectFaqColumns(vietnameseHeaders);

    assert.equal(detectedVi.questionCol, 'Câu hỏi thường gặp');
    assert.equal(detectedVi.answerCol, 'Câu trả lời chi tiết');
    assert.equal(detectedVi.categoryCol, 'Danh mục phân loại');
    assert.equal(detectedVi.pinnedCol, 'Ghim');

    const englishHeaders = ['ID', 'Question', 'Answer', 'Category', 'Is_Pinned'];
    const detectedEn = detectFaqColumns(englishHeaders);

    assert.equal(detectedEn.questionCol, 'Question');
    assert.equal(detectedEn.answerCol, 'Answer');
    assert.equal(detectedEn.categoryCol, 'Category');
    assert.equal(detectedEn.pinnedCol, 'Is_Pinned');
});

test('detectFaqColumns falls back sensibly when header names do not match regex', () => {
    const plainHeaders = ['ColA', 'ColB', 'ColC'];
    const detected = detectFaqColumns(plainHeaders);

    assert.equal(detected.questionCol, 'ColA');
    assert.equal(detected.answerCol, 'ColB');
    assert.equal(detected.categoryCol, 'ColC');
});

test('transformExcelRows correctly transforms rows into ParsedFaqItems and validates completeness', () => {
    const mapping: FaqColumnMapping = {
        questionCol: 'Hỏi',
        answerCol: 'Đáp',
        categoryCol: 'Nhóm',
        pinnedCol: 'Ghim',
    };

    const rawRows = [
        {
            'Hỏi': 'Địa điểm tổ chức ở đâu?',
            'Đáp': 'Hội trường Innovation Hall.',
            'Nhóm': 'Hậu cần',
            'Ghim': 'Có',
        },
        {
            'Hỏi': 'Có được cấp giấy chứng nhận không?',
            'Đáp': 'Có cấp chứng nhận tham gia online qua email.',
            'Nhóm': '',
            'Ghim': 'Không',
        },
        {
            'Hỏi': 'Câu hỏi chưa có trả lời',
            'Đáp': '',
            'Nhóm': 'Chung',
            'Ghim': false,
        },
    ];

    const items = transformExcelRows(rawRows, mapping, 'Thể lệ & Tham dự');

    assert.equal(items.length, 3);

    // Item 1
    assert.equal(items[0].question, 'Địa điểm tổ chức ở đâu?');
    assert.equal(items[0].answer, 'Hội trường Innovation Hall.');
    assert.equal(items[0].category, 'Hậu cần');
    assert.equal(items[0].isPinned, true);
    assert.equal(items[0].isValid, true);

    // Item 2: Empty category falls back to default
    assert.equal(items[1].category, 'Thể lệ & Tham dự');
    assert.equal(items[1].isPinned, false);
    assert.equal(items[1].isValid, true);

    // Item 3: Missing answer is marked invalid
    assert.equal(items[2].isValid, false);
    assert.equal(items[2].errorReason, 'Thiếu nội dung câu trả lời');
});

test('toCreateFaqRequest formats request correctly for backend submission', () => {
    const item: ParsedFaqItem = {
        id: 'faq_test_1',
        question: '  Thời gian khai mạc khi nào?  ',
        answer: '  8:00 sáng Thứ 7.  ',
        category: '  Lịch trình  ',
        isPinned: true,
        isValid: true,
    };

    const req = toCreateFaqRequest(item);
    assert.deepEqual(req, {
        question: 'Thời gian khai mạc khi nào?',
        answer: '8:00 sáng Thứ 7.',
        category: 'Lịch trình',
        isPinned: true,
    });
});
