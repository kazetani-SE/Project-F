import test from 'node:test';
import assert from 'node:assert/strict';
import { getErrorMessage } from '../src/utils/errorHelper.ts';

test('getErrorMessage extracts message from ApiError rejected by apiClient', () => {
    const apiError = {
        status: 400,
        errorCode: 'INVALID_MIME_TYPE',
        message: 'Định dạng tệp ".psd" không được hỗ trợ cho danh mục MEDIA.',
    };

    const msg = getErrorMessage(apiError, 'Lỗi chung');
    assert.equal(msg, 'Định dạng tệp ".psd" không được hỗ trợ cho danh mục MEDIA.');
});

test('getErrorMessage extracts message from Axios-like response object', () => {
    const axiosError = {
        name: 'AxiosError',
        message: 'Request failed with status code 400',
        response: {
            status: 400,
            data: {
                message: 'Kích thước tệp vượt quá hạn mức 100MB cho phép.',
            },
        },
    };

    const msg = getErrorMessage(axiosError, 'Lỗi chung');
    assert.equal(msg, 'Kích thước tệp vượt quá hạn mức 100MB cho phép.');
});

test('getErrorMessage handles standard JavaScript Error instance', () => {
    const error = new Error('Tệp không tồn tại hoặc đã bị xóa');
    const msg = getErrorMessage(error, 'Lỗi chung');
    assert.equal(msg, 'Tệp không tồn tại hoặc đã bị xóa');
});

test('getErrorMessage falls back gracefully when message is missing or empty', () => {
    assert.equal(getErrorMessage(null, 'Lỗi dự phòng'), 'Lỗi dự phòng');
    assert.equal(getErrorMessage(undefined, 'Lỗi dự phòng'), 'Lỗi dự phòng');
    assert.equal(getErrorMessage({}, 'Lỗi dự phòng'), 'Lỗi dự phòng');
    assert.equal(getErrorMessage({ message: '   ' }, 'Lỗi dự phòng'), 'Lỗi dự phòng');
});
