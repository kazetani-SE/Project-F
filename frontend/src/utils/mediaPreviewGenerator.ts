/**
 * Media Preview Generator Utility
 * Tự động trích xuất frame/thumbnail xem trước:
 * - Ảnh chuẩn Web (.jpg, .jpeg, .png, .webp)
 * - File đồ họa in ấn TIFF (.tif, .tiff) -> Giải mã client-side bằng UTIF sang WebP (Dynamic Import)
 * - File tài liệu/thiết kế PDF (.pdf) -> Render trang đầu tiên bằng pdfjs-dist sang WebP (Dynamic Import)
 * - Video (.mp4) -> Trích xuất video frame đầu tiên thành WebP
 * 
 * Lưu ý: Sử dụng Dynamic Import để không bao giờ làm nặng bundle chính hoặc gây trắng màn hình.
 */

// Tự phòng hộ Polyfill Promise.withResolvers (ECMAScript 2024)
function ensurePromiseWithResolvers() {
    if (typeof (Promise as any).withResolvers === 'undefined') {
        (Promise as any).withResolvers = function <T>() {
            let resolve!: (value: T | PromiseLike<T>) => void;
            let reject!: (reason?: any) => void;
            const promise = new Promise<T>((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        };
    }
}

export interface GeneratedPreviewResult {
    previewBlob: Blob | null;
    previewUrl: string | null;
    isOriginalWebImage: boolean;
}

/**
 * Trích xuất ảnh thumbnail từ tệp TIFF (.tif / .tiff) bằng thư viện UTIF
 */
export async function extractTiffThumbnail(tiffFile: File, maxDim: number = 1000): Promise<Blob | null> {
    try {
        const arrayBuffer = await tiffFile.arrayBuffer();
        const utifModule = await import('utif');
        const utifLib: any = (utifModule as any)?.default || utifModule;
        if (!utifLib?.decode) return null;

        const ifds = utifLib.decode(arrayBuffer);
        if (!ifds || ifds.length === 0) return null;

        const firstPage = ifds[0];
        utifLib.decodeImage(arrayBuffer, firstPage);
        const rgba = utifLib.toRGBA8(firstPage);
        if (!rgba || !firstPage.width || !firstPage.height) return null;

        const origW = firstPage.width;
        const origH = firstPage.height;

        // Vẽ lên canvas offscreen
        const offCanvas = document.createElement('canvas');
        offCanvas.width = origW;
        offCanvas.height = origH;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return null;

        const imgData = offCtx.createImageData(origW, origH);
        imgData.data.set(rgba);
        offCtx.putImageData(imgData, 0, 0);

        // Thu nhỏ xuống kích thước preview sắc nét và tiết kiệm dung lượng
        let targetW = origW;
        let targetH = origH;
        if (targetW > maxDim || targetH > maxDim) {
            if (targetW > targetH) {
                targetH = Math.round((targetH * maxDim) / targetW);
                targetW = maxDim;
            } else {
                targetW = Math.round((targetW * maxDim) / targetH);
                targetH = maxDim;
            }
        }

        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetW;
        outCanvas.height = targetH;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) return null;

        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';
        outCtx.drawImage(offCanvas, 0, 0, targetW, targetH);

        return new Promise((resolve) => {
            outCanvas.toBlob(
                (blob) => resolve(blob),
                'image/webp',
                0.85
            );
        });
    } catch (err) {
        console.warn('Không thể giải mã preview từ file TIFF:', err);
        return null;
    }
}

/**
 * Trích xuất ảnh trang 1 từ tệp PDF (.pdf) bằng thư viện pdfjs-dist
 */
export async function extractPdfThumbnail(pdfFile: File, maxDim: number = 1000): Promise<Blob | null> {
    try {
        ensurePromiseWithResolvers();
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist');

        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            useSystemFonts: true,
            isEvalSupported: false,
        });

        const pdf = await loadingTask.promise;
        if (!pdf || pdf.numPages === 0) return null;

        const page = await pdf.getPage(1);
        const unscaledViewport = page.getViewport({ scale: 1 });

        let scale = 1.0;
        const maxPageDim = Math.max(unscaledViewport.width, unscaledViewport.height);
        if (maxPageDim > 0) {
            scale = Math.min(1.5, maxDim / maxPageDim);
        }

        const viewport = page.getViewport({ scale: Math.max(scale, 0.5) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        await page.render({
            canvasContext: ctx,
            viewport,
        }).promise;

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => resolve(blob),
                'image/webp',
                0.85
            );
        });
    } catch (err) {
        console.warn('Không thể tạo preview từ file PDF:', err);
        return null;
    }
}

/**
 * Trích xuất ảnh thumbnail từ một file video MP4
 */
export async function extractVideoThumbnail(videoFile: File, seekTimeSec: number = 1.0): Promise<Blob | null> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        const objectUrl = URL.createObjectURL(videoFile);
        video.src = objectUrl;

        let resolved = false;
        const cleanup = () => {
            URL.revokeObjectURL(objectUrl);
            video.remove();
        };

        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                cleanup();
                resolve(null);
            }
        }, 8000);

        video.onloadedmetadata = () => {
            const targetTime = Math.min(seekTimeSec, video.duration > 0 ? video.duration / 2 : 0.5);
            video.currentTime = targetTime;
        };

        video.onseeked = () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);

            try {
                const canvas = document.createElement('canvas');
                const maxDim = 800;
                let w = video.videoWidth || 640;
                let h = video.videoHeight || 360;

                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, w, h);
                    canvas.toBlob(
                        (blob) => {
                            cleanup();
                            resolve(blob);
                        },
                        'image/webp',
                        0.85
                    );
                } else {
                    cleanup();
                    resolve(null);
                }
            } catch {
                cleanup();
                resolve(null);
            }
        };

        video.onerror = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                cleanup();
                resolve(null);
            }
        };
    });
}

/**
 * Phân tích file và tạo preview phù hợp:
 * - File ảnh Web (.png, .jpg, .webp) -> Giữ nguyên
 * - File .TIF / .TIFF -> Giải mã bằng UTIF
 * - File .PDF -> Render trang đầu tiên bằng pdfjs-dist
 * - File Video .MP4 -> Trích xuất frame video
 */
export async function generateMediaPreview(file: File): Promise<GeneratedPreviewResult> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const type = file.type.toLowerCase();

    // 1. Nếu là ảnh chuẩn web
    if (type.startsWith('image/jpeg') || type.startsWith('image/png') || type.startsWith('image/webp')) {
        return {
            previewBlob: file,
            previewUrl: URL.createObjectURL(file),
            isOriginalWebImage: true,
        };
    }

    // 2. Nếu là file TIFF (.tif / .tiff)
    if (ext === 'tif' || ext === 'tiff' || type.includes('tiff')) {
        const tiffThumb = await extractTiffThumbnail(file, 1000);
        if (tiffThumb) {
            return {
                previewBlob: tiffThumb,
                previewUrl: URL.createObjectURL(tiffThumb),
                isOriginalWebImage: false,
            };
        }
    }

    // 3. Nếu là file PDF (.pdf)
    if (ext === 'pdf' || type.includes('pdf')) {
        const pdfThumb = await extractPdfThumbnail(file, 1000);
        if (pdfThumb) {
            return {
                previewBlob: pdfThumb,
                previewUrl: URL.createObjectURL(pdfThumb),
                isOriginalWebImage: false,
            };
        }
    }

    // 4. Nếu là video MP4
    if (type.includes('mp4') || ext === 'mp4') {
        const thumbBlob = await extractVideoThumbnail(file, 1.0);
        if (thumbBlob) {
            return {
                previewBlob: thumbBlob,
                previewUrl: URL.createObjectURL(thumbBlob),
                isOriginalWebImage: false,
            };
        }
    }

    // 5. Các file còn lại không được hỗ trợ tạo preview
    return {
        previewBlob: null,
        previewUrl: null,
        isOriginalWebImage: false,
    };
}
