import test from 'node:test';
import assert from 'node:assert/strict';
import {
    validateUploadFile,
    executeStagedUploadAndSave,
    incrementDocumentVersion,
    resolveVersionHistoryChain,
} from '../src/services/uploadWorkflow.ts';
import { STORAGE_LIMITS } from '../src/types/models/storage.ts';

test('Bug Repro: File validation correctly checks size and MIME type without uploading', () => {
    // 1. File exceeding limit
    const oversizedFile = {
        name: 'large_document.pdf',
        size: STORAGE_LIMITS.DOCUMENT + 1024,
        type: 'application/pdf',
    } as File;

    assert.throws(
        () => validateUploadFile(oversizedFile, 'DOCUMENT'),
        /vượt quá hạn mức/,
        'Should reject file exceeding size limit'
    );

    // 2. File with invalid MIME type
    const invalidTypeFile = {
        name: 'script.exe',
        size: 1024,
        type: 'application/x-msdownload',
    } as File;

    assert.throws(
        () => validateUploadFile(invalidTypeFile, 'DOCUMENT'),
        /không được hỗ trợ/,
        'Should reject unsupported MIME type'
    );

    // 3. Valid file should pass validation
    const validFile = {
        name: 'plan.pdf',
        size: 1024 * 1024,
        type: 'application/pdf',
    } as File;

    assert.doesNotThrow(() => validateUploadFile(validFile, 'DOCUMENT'));
});

test('Bug Repro: Staged upload must abort and NEVER call Database save if S3 upload fails', async () => {
    let s3UploadCalled = false;
    let dbSaveCalled = false;

    const mockFile = {
        name: 'ke_hoach.pdf',
        size: 2048,
        type: 'application/pdf',
    } as File;

    const mockUploadToS3 = async () => {
        s3UploadCalled = true;
        throw new Error('Network error: S3 connection timed out');
    };

    const mockSaveToDatabase = async () => {
        dbSaveCalled = true;
    };

    await assert.rejects(
        async () => {
            await executeStagedUploadAndSave({
                file: mockFile,
                category: 'DOCUMENT',
                uploadToS3: mockUploadToS3,
                saveToDatabase: mockSaveToDatabase,
            });
        },
        /S3 connection timed out/,
        'Should bubble up the S3 upload error'
    );

    assert.equal(s3UploadCalled, true, 'S3 upload should have been attempted upon save');
    assert.equal(dbSaveCalled, false, 'Database save MUST NOT be called when S3 upload fails');
});

test('Bug Repro: Successful S3 upload passes fileUrl to Database save and completes', async () => {
    let s3UploadCalled = false;
    let savedFileUrl = '';

    const mockFile = {
        name: 'ke_hoach.pdf',
        size: 2048,
        type: 'application/pdf',
    } as File;

    const expectedUrl = 'https://project-f-media-fcode.s3.ap-southeast-1.amazonaws.com/documents/test.pdf';

    const mockUploadToS3 = async () => {
        s3UploadCalled = true;
        return {
            fileUrl: expectedUrl,
            objectKey: 'documents/test.pdf',
            fileName: mockFile.name,
            fileSize: mockFile.size,
        };
    };

    const mockSaveToDatabase = async (fileUrl: string) => {
        savedFileUrl = fileUrl;
    };

    await executeStagedUploadAndSave({
        file: mockFile,
        category: 'DOCUMENT',
        uploadToS3: mockUploadToS3,
        saveToDatabase: mockSaveToDatabase,
    });

    assert.equal(s3UploadCalled, true);
    assert.equal(savedFileUrl, expectedUrl, 'Database save should receive the exact S3 fileUrl');
});

test('Document lifecycle: incrementDocumentVersion handles integer minor versions without float drift', () => {
    assert.equal(incrementDocumentVersion('1.0'), '1.1');
    assert.equal(incrementDocumentVersion('1.9'), '1.10');
    assert.equal(incrementDocumentVersion('v2.3'), '2.4');
});

test('Document lifecycle: resolveVersionHistoryChain resolves full multi-hop root-to-leaf tree', () => {
    const docs = [
        { id: 'doc-1', parentDocumentId: null, version: '1.0' },
        { id: 'doc-2', parentDocumentId: 'doc-1', version: '1.1' },
        { id: 'doc-3', parentDocumentId: 'doc-2', version: '1.2' },
        { id: 'other-doc', parentDocumentId: null, version: '1.0' },
    ];

    const chainFromLeaf = resolveVersionHistoryChain(docs, docs[2]);
    assert.deepEqual(
        chainFromLeaf.map((d) => d.id),
        ['doc-1', 'doc-2', 'doc-3'],
        'Should include root, parent, and leaf across 3 hops while excluding unrelated documents',
    );
});
