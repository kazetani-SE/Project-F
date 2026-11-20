import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUploadFile } from '../src/services/uploadWorkflow.ts';
import { MEDIA_ASSET_TYPE_LABELS } from '../src/types/models/media.ts';
import { generateMediaPreview } from '../src/utils/mediaPreviewGenerator.ts';

test('Media Asset Labels match Figma design specifications', () => {
    assert.equal(MEDIA_ASSET_TYPE_LABELS.POSTER, 'Poster');
    assert.equal(MEDIA_ASSET_TYPE_LABELS.STANDEE, 'Standee');
    assert.equal(MEDIA_ASSET_TYPE_LABELS.BACKDROP, 'Backdrop');
    assert.equal(MEDIA_ASSET_TYPE_LABELS.BADGE, 'Thẻ đeo');
    assert.equal(MEDIA_ASSET_TYPE_LABELS.SOCIAL_POST, 'Bài đăng MXH');
    assert.equal(MEDIA_ASSET_TYPE_LABELS.TRAILER, 'Trailer');
    assert.equal(MEDIA_ASSET_TYPE_LABELS.BANNER, 'Banner');
    assert.equal(MEDIA_ASSET_TYPE_LABELS.OTHER, 'Ấn phẩm khác');
});

test('Media Upload Validation accepts TIFF, PDF, web images and video files', () => {
    // 1. TIFF file (.tif)
    const tifFile = new File(['mock content'], 'standee_cmyk.tif', { type: 'image/tiff' });
    assert.doesNotThrow(() => validateUploadFile(tifFile, 'MEDIA'));

    // 2. PDF file (.pdf)
    const pdfFile = new File(['mock pdf'], 'poster_cmyk.pdf', { type: 'application/pdf' });
    assert.doesNotThrow(() => validateUploadFile(pdfFile, 'MEDIA'));

    // 3. MP4 Video file
    const mp4File = new File(['mock video'], 'teaser_30s.mp4', { type: 'video/mp4' });
    assert.doesNotThrow(() => validateUploadFile(mp4File, 'MEDIA'));

    // 4. Large TIFF file (75MB) should be accepted under 100MB limit
    const largeTifFile = {
        name: 'backdrop_stage_3x5m.tif',
        size: 75 * 1024 * 1024,
        type: 'image/tiff',
    } as unknown as File;
    assert.doesNotThrow(() => validateUploadFile(largeTifFile, 'MEDIA'));
});

test('Media Upload Validation rejects Photoshop/Illustrator raw files and executables', () => {
    // 1. Photoshop raw file (.psd) -> Rejected
    const psdFile = new File(['mock psd'], 'poster_main.psd', { type: 'application/x-photoshop' });
    assert.throws(
        () => validateUploadFile(psdFile, 'MEDIA'),
        /không được hỗ trợ cho danh mục MEDIA/
    );

    // 2. Illustrator raw file (.ai) -> Rejected
    const aiFile = new File(['mock ai'], 'vector_logo.ai', { type: 'application/illustrator' });
    assert.throws(
        () => validateUploadFile(aiFile, 'MEDIA'),
        /không được hỗ trợ cho danh mục MEDIA/
    );

    // 3. Executable file (.exe) -> Rejected
    const exeFile = new File(['harmful code'], 'installer.exe', { type: 'application/x-msdownload' });
    assert.throws(
        () => validateUploadFile(exeFile, 'MEDIA'),
        /không được hỗ trợ cho danh mục MEDIA/
    );
});

test('Media Upload Validation rejects files exceeding 100MB', () => {
    const oversizedFile = {
        name: 'heavy_backdrop.tif',
        size: 105 * 1024 * 1024,
        type: 'image/tiff',
    } as unknown as File;

    assert.throws(
        () => validateUploadFile(oversizedFile, 'MEDIA'),
        /vượt quá hạn mức cho phép/
    );
});

test('generateMediaPreview identifies web images and falls back appropriately', async () => {
    // Standard web image
    const pngFile = new File(['png-data'], 'banner.png', { type: 'image/png' });
    const pngPreview = await generateMediaPreview(pngFile);
    assert.equal(pngPreview.isOriginalWebImage, true);
    assert.notEqual(pngPreview.previewUrl, null);

    // Raw PSD -> should not render preview, returns null
    const psdFile = new File(['psd-data'], 'poster.psd', { type: 'application/octet-stream' });
    const psdPreview = await generateMediaPreview(psdFile);
    assert.equal(psdPreview.isOriginalWebImage, false);
    assert.equal(psdPreview.previewBlob, null);
    assert.equal(psdPreview.previewUrl, null);
});
