import React, { useState, useEffect, useId, useMemo } from 'react';
import {
    FileSpreadsheet,
    FileText,
    Upload,
    XCircle,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Download,
    Pin,
    Trash2,
    Search,
    HelpCircle,
    Check,
} from 'lucide-react';
import { createFaqsBatch } from '../../../services/knowledgeService';
import {
    parseFaqExcel,
    parseFaqWord,
    downloadFaqExcelTemplate,
    toCreateFaqRequest,
    type ParsedFaqItem,
    type ExcelFaqData,
    type WordFaqData,
    type FaqColumnMapping,
} from '../../../utils/faqParser';

interface Props {
    seriesId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}

export const FaqImportModal: React.FC<Props> = ({
    seriesId,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const sheetSelectId = useId();
    const defaultCategorySelectId = useId();
    const questionColSelectId = useId();
    const answerColSelectId = useId();
    const categoryColSelectId = useId();
    const pinnedColSelectId = useId();

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<'EXCEL' | 'WORD' | null>(null);

    // Parsing states
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);

    // Excel specific states
    const [excelData, setExcelData] = useState<ExcelFaqData | null>(null);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [columnMapping, setColumnMapping] = useState<FaqColumnMapping>({
        questionCol: '',
        answerCol: '',
        categoryCol: '',
        pinnedCol: '',
    });

    // Word specific states
    const [wordData, setWordData] = useState<WordFaqData | null>(null);

    // Common parsed items state
    const [parsedItems, setParsedItems] = useState<ParsedFaqItem[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [defaultCategory, setDefaultCategory] = useState<string>('Thể lệ & Tham dự');
    const [searchPreviewQuery, setSearchPreviewQuery] = useState('');

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccessCount, setSubmitSuccessCount] = useState<number | null>(null);

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setSelectedFile(null);
            setFileType(null);
            setIsParsing(false);
            setParseError(null);
            setExcelData(null);
            setSelectedSheet('');
            setColumnMapping({ questionCol: '', answerCol: '', categoryCol: '', pinnedCol: '' });
            setWordData(null);
            setParsedItems([]);
            setSelectedItemIds(new Set());
            setDefaultCategory('Thể lệ & Tham dự');
            setSearchPreviewQuery('');
            setIsSubmitting(false);
            setSubmitError(null);
            setSubmitSuccessCount(null);
        }
    }, [isOpen]);

    // Handle file selection
    const handleFileSelect = async (file: File | null) => {
        setSelectedFile(file);
        setParseError(null);
        setSubmitError(null);
        setExcelData(null);
        setWordData(null);
        setParsedItems([]);
        setSelectedItemIds(new Set());

        if (!file) {
            setFileType(null);
            return;
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
        const isWord = ['docx', 'doc'].includes(ext);

        if (!isExcel && !isWord) {
            setParseError('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp Excel (.xlsx, .xls, .csv) hoặc Word (.docx).');
            return;
        }

        setIsParsing(true);
        try {
            if (isExcel) {
                setFileType('EXCEL');
                const data = await parseFaqExcel(file, undefined, undefined, defaultCategory);
                setExcelData(data);
                setSelectedSheet(data.currentSheet);
                setColumnMapping(data.detectedMapping);
                setParsedItems(data.items);
                // Mặc định chọn các dòng hợp lệ
                const validIds = new Set(data.items.filter((i) => i.isValid).map((i) => i.id));
                setSelectedItemIds(validIds);
            } else {
                setFileType('WORD');
                const data = await parseFaqWord(file, defaultCategory);
                setWordData(data);
                setParsedItems(data.items);
                const validIds = new Set(data.items.filter((i) => i.isValid).map((i) => i.id));
                setSelectedItemIds(validIds);
            }
        } catch (err: unknown) {
            setParseError(err instanceof Error ? err.message : 'Lỗi khi đọc và phân tích tệp.');
        } finally {
            setIsParsing(false);
        }
    };

    // Re-parse Excel when sheet changes
    const handleSheetChange = async (sheetName: string) => {
        if (!selectedFile) return;
        setSelectedSheet(sheetName);
        setIsParsing(true);
        try {
            const data = await parseFaqExcel(selectedFile, sheetName, undefined, defaultCategory);
            setExcelData(data);
            setColumnMapping(data.detectedMapping);
            setParsedItems(data.items);
            const validIds = new Set(data.items.filter((i) => i.isValid).map((i) => i.id));
            setSelectedItemIds(validIds);
        } catch (err: unknown) {
            setParseError(err instanceof Error ? err.message : 'Không thể đọc sheet đã chọn.');
        } finally {
            setIsParsing(false);
        }
    };

    // Re-apply mapping when Excel column mapping changes
    const handleMappingChange = (key: keyof FaqColumnMapping, value: string) => {
        const nextMapping: FaqColumnMapping = { ...columnMapping, [key]: value };
        setColumnMapping(nextMapping);
        if (excelData && selectedFile) {
            setIsParsing(true);
            parseFaqExcel(selectedFile, selectedSheet, nextMapping, defaultCategory)
                .then((data) => {
                    setParsedItems(data.items);
                    const validIds = new Set(data.items.filter((i) => i.isValid).map((i) => i.id));
                    setSelectedItemIds(validIds);
                })
                .catch((err) => {
                    setParseError(err instanceof Error ? err.message : 'Lỗi áp dụng mapping cột.');
                })
                .finally(() => setIsParsing(false));
        }
    };

    // Update single item fields inline in preview
    const handleItemChange = (id: string, field: keyof ParsedFaqItem, value: string | boolean) => {
        setParsedItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const updated = { ...item, [field]: value };
                const isValid = Boolean(updated.question.trim() && updated.answer.trim());
                return {
                    ...updated,
                    isValid,
                    errorReason: isValid ? undefined : !updated.question.trim() ? 'Thiếu câu hỏi' : 'Thiếu câu trả lời',
                };
            }),
        );
    };

    // Remove item from preview
    const handleRemoveItem = (id: string) => {
        setParsedItems((prev) => prev.filter((i) => i.id !== id));
        setSelectedItemIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    // Toggle single selection
    const handleToggleSelect = (id: string) => {
        setSelectedItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Toggle select all
    const handleToggleSelectAll = () => {
        const validItems = parsedItems.filter((i) => i.isValid);
        if (selectedItemIds.size === validItems.length && validItems.length > 0) {
            setSelectedItemIds(new Set());
        } else {
            setSelectedItemIds(new Set(validItems.map((i) => i.id)));
        }
    };

    // Batch apply category to selected items
    const handleApplyCategoryToSelected = (categoryName: string) => {
        if (!categoryName.trim()) return;
        setParsedItems((prev) =>
            prev.map((item) =>
                selectedItemIds.has(item.id) ? { ...item, category: categoryName.trim() } : item,
            ),
        );
    };

    // Final submit
    const handleSubmit = async () => {
        const itemsToSubmit = parsedItems
            .filter((i) => selectedItemIds.has(i.id) && i.isValid)
            .map(toCreateFaqRequest);

        if (itemsToSubmit.length === 0) {
            setSubmitError('Vui lòng chọn ít nhất 1 câu hỏi hợp lệ để nhập vào hệ thống.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const created = await createFaqsBatch(seriesId, itemsToSubmit);
            setSubmitSuccessCount(created.length);
            await onSuccess();
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi lưu câu hỏi FAQ.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter preview list by search query
    const filteredPreviewItems = useMemo(() => {
        if (!searchPreviewQuery.trim()) return parsedItems;
        const q = searchPreviewQuery.toLowerCase();
        return parsedItems.filter(
            (i) =>
                i.question.toLowerCase().includes(q) ||
                i.answer.toLowerCase().includes(q) ||
                i.category.toLowerCase().includes(q),
        );
    }, [parsedItems, searchPreviewQuery]);

    const validCount = parsedItems.filter((i) => i.isValid).length;
    const selectedCount = selectedItemIds.size;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5 backdrop-blur-xs">
            <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">
                                Nhập FAQ từ tệp (Word & Excel)
                            </h3>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                Đa định dạng
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Tự động trích xuất bảng hỏi đáp hoặc văn bản đề mục thành kho FAQ câu lạc bộ
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center border-b border-slate-100 bg-white px-6 py-2.5 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                        <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                step === 1
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-100 text-emerald-700'
                            }`}
                        >
                            {step > 1 ? <Check className="h-3.5 w-3.5" /> : '1'}
                        </span>
                        <span className={step === 1 ? 'font-bold text-slate-900' : 'text-slate-600'}>
                            Tải lên & Khớp cấu trúc
                        </span>
                    </div>

                    <ArrowRight className="mx-4 h-4 w-4 text-slate-300" />

                    <div className="flex items-center gap-2">
                        <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                step === 2
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                            2
                        </span>
                        <span className={step === 2 ? 'font-bold text-slate-900' : 'text-slate-500'}>
                            Xem trước & Tinh chỉnh ({parsedItems.length} câu)
                        </span>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {submitSuccessCount !== null ? (
                        <div className="flex h-64 flex-col items-center justify-center text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h4 className="mt-4 text-lg font-bold text-slate-900">
                                Nhập thành công {submitSuccessCount} câu hỏi FAQ!
                            </h4>
                            <p className="mt-1 text-sm text-slate-500">
                                Kho FAQ của sự kiện đã được đồng bộ và cập nhật.
                            </p>
                        </div>
                    ) : step === 1 ? (
                        /* STEP 1: Upload and Configure */
                        <div className="space-y-6">
                            {/* Drag & Drop Upload Zone */}
                            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition-all">
                                <input
                                    type="file"
                                    id="faq-file-input"
                                    accept=".xlsx,.xls,.csv,.docx,.doc"
                                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="faq-file-input"
                                    className="flex cursor-pointer flex-col items-center justify-center"
                                >
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs text-emerald-600 border border-slate-200">
                                        <Upload className="h-7 w-7" />
                                    </div>
                                    <p className="mt-3 text-sm font-semibold text-slate-800">
                                        {selectedFile ? selectedFile.name : 'Nhấn để chọn tệp hoặc kéo thả vào đây'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Hỗ trợ định dạng Microsoft Excel (.xlsx, .xls, .csv) và Word (.docx) dung lượng dưới 15MB
                                    </p>
                                </label>

                                {selectedFile && (
                                    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                                        {fileType === 'EXCEL' ? (
                                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                        ) : (
                                            <FileText className="h-4 w-4 text-blue-600" />
                                        )}
                                        <span>
                                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Parsing state or error */}
                            {isParsing && (
                                <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-800">
                                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                                    <span>Đang đọc và phân tích cấu trúc dữ liệu tệp...</span>
                                </div>
                            )}

                            {parseError && (
                                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                                    <span>{parseError}</span>
                                </div>
                            )}

                            {/* Excel Configuration */}
                            {fileType === 'EXCEL' && excelData && !isParsing && (
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                                            <h4 className="text-sm font-bold text-slate-800">
                                                Khớp các cột từ tệp Excel
                                            </h4>
                                        </div>
                                        {excelData.sheetNames.length > 1 && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <label htmlFor={sheetSelectId} className="font-semibold text-slate-600">
                                                    Chọn Sheet:
                                                </label>
                                                <select
                                                    id={sheetSelectId}
                                                    value={selectedSheet}
                                                    onChange={(e) => handleSheetChange(e.target.value)}
                                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold focus:border-emerald-500"
                                                >
                                                    {excelData.sheetNames.map((s) => (
                                                        <option key={s} value={s}>
                                                            {s}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                                        <div>
                                            <label htmlFor={questionColSelectId} className="block font-semibold text-slate-700">
                                                Cột Câu hỏi (*)
                                            </label>
                                            <select
                                                id={questionColSelectId}
                                                value={columnMapping.questionCol}
                                                onChange={(e) => handleMappingChange('questionCol', e.target.value)}
                                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-emerald-500 font-medium"
                                            >
                                                <option value="">-- Chọn cột câu hỏi --</option>
                                                {excelData.headers.map((h) => (
                                                    <option key={h} value={h}>
                                                        {h}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor={answerColSelectId} className="block font-semibold text-slate-700">
                                                Cột Câu trả lời (*)
                                            </label>
                                            <select
                                                id={answerColSelectId}
                                                value={columnMapping.answerCol}
                                                onChange={(e) => handleMappingChange('answerCol', e.target.value)}
                                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-emerald-500 font-medium"
                                            >
                                                <option value="">-- Chọn cột câu trả lời --</option>
                                                {excelData.headers.map((h) => (
                                                    <option key={h} value={h}>
                                                        {h}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor={categoryColSelectId} className="block font-semibold text-slate-700">
                                                Cột Danh mục (Tùy chọn)
                                            </label>
                                            <select
                                                id={categoryColSelectId}
                                                value={columnMapping.categoryCol || ''}
                                                onChange={(e) => handleMappingChange('categoryCol', e.target.value)}
                                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-emerald-500 font-medium"
                                            >
                                                <option value="">(Không có cột danh mục - Dùng danh mục mặc định)</option>
                                                {excelData.headers.map((h) => (
                                                    <option key={h} value={h}>
                                                        {h}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor={pinnedColSelectId} className="block font-semibold text-slate-700">
                                                Cột Ghim ưu tiên (Tùy chọn)
                                            </label>
                                            <select
                                                id={pinnedColSelectId}
                                                value={columnMapping.pinnedCol || ''}
                                                onChange={(e) => handleMappingChange('pinnedCol', e.target.value)}
                                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-emerald-500 font-medium"
                                            >
                                                <option value="">(Không có cột ghim)</option>
                                                {excelData.headers.map((h) => (
                                                    <option key={h} value={h}>
                                                        {h}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Word Detected Summary */}
                            {fileType === 'WORD' && wordData && !isParsing && (
                                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-2">
                                    <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <span>Đã phân tích văn bản Word</span>
                                    </div>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Chế độ nhận diện:{' '}
                                        <strong className="font-semibold">
                                            {wordData.detectedMode === 'TABLE'
                                                ? 'Bảng dữ liệu Hỏi - Đáp (Table)'
                                                : wordData.detectedMode === 'QA_TEXT'
                                                ? 'Đoạn văn tiêu đề Q&A (Headings & Paragraphs)'
                                                : 'Văn bản thô'}
                                        </strong>
                                        . Đã tìm thấy{' '}
                                        <strong className="text-blue-900">{parsedItems.length} câu hỏi</strong> trong tệp.
                                    </p>
                                </div>
                            )}

                            {/* Default Fallback Settings */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                                <h4 className="text-sm font-bold text-slate-800">Cấu hình danh mục dự phòng</h4>
                                <div>
                                    <label htmlFor={defaultCategorySelectId} className="block text-xs font-semibold text-slate-700">
                                        Danh mục mặc định (áp dụng khi câu hỏi không có danh mục cụ thể)
                                    </label>
                                    <input
                                        type="text"
                                        id={defaultCategorySelectId}
                                        value={defaultCategory}
                                        onChange={(e) => setDefaultCategory(e.target.value)}
                                        placeholder="Thể lệ & Tham dự / Hậu cần / Tài chính..."
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                                    />
                                </div>
                            </div>

                            {/* Instructions & Template Download */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                                        <HelpCircle className="h-4 w-4 text-slate-500" />
                                        <span>Chưa có tệp chuẩn? Tải mẫu hoặc xem gợi ý định dạng</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={downloadFaqExcelTemplate}
                                        className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        <span>Tải tệp mẫu Excel (.xlsx)</span>
                                    </button>
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-slate-600">
                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <span className="font-bold text-emerald-700">Cấu trúc Excel:</span>
                                        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-500">
                                            <li>Dòng 1: Tiêu đề cột (Câu hỏi, Câu trả lời, Danh mục, Ghim)</li>
                                            <li>Các dòng sau: Nội dung câu hỏi và giải đáp chi tiết</li>
                                        </ul>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <span className="font-bold text-blue-700">Cấu trúc Word:</span>
                                        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-500">
                                            <li>Cách 1: Lập bảng gồm cột Hỏi và cột Đáp</li>
                                            <li>Cách 2: Đánh dấu đoạn <code className="text-emerald-700">Q: [Câu hỏi]</code> và <code className="text-emerald-700">A: [Trả lời]</code></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* STEP 2: Preview & Refine */
                        <div className="space-y-4">
                            {/* Summary Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="font-bold text-slate-800">
                                        Tổng cộng: {parsedItems.length} câu
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="font-semibold text-emerald-700">
                                        Hợp lệ: {validCount} câu
                                    </span>
                                    {parsedItems.length - validCount > 0 && (
                                        <>
                                            <span className="text-slate-300">|</span>
                                            <span className="font-semibold text-rose-600">
                                                Cần bổ sung: {parsedItems.length - validCount} câu
                                            </span>
                                        </>
                                    )}
                                    <span className="text-slate-300">|</span>
                                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-bold text-white">
                                        Đã chọn nhập: {selectedCount}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleToggleSelectAll}
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        {selectedItemIds.size === validCount && validCount > 0
                                            ? 'Bỏ chọn tất cả'
                                            : 'Chọn tất cả hợp lệ'}
                                    </button>
                                </div>
                            </div>

                            {/* Search & Batch category assign */}
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchPreviewQuery}
                                        onChange={(e) => setSearchPreviewQuery(e.target.value)}
                                        placeholder="Tìm kiếm trong danh sách xem trước..."
                                        className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-emerald-500 focus:outline-hidden"
                                    />
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500">Gán danh mục cho mục đã chọn:</span>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyCategoryToSelected('Thể lệ & Tham dự')}
                                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Thể lệ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyCategoryToSelected('Tài chính')}
                                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Tài chính
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyCategoryToSelected('Hậu cần')}
                                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Hậu cần
                                    </button>
                                </div>
                            </div>

                            {/* Preview List */}
                            {filteredPreviewItems.length === 0 ? (
                                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                                    <p>Không tìm thấy câu hỏi nào phù hợp với bộ lọc tìm kiếm.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                                    {filteredPreviewItems.map((item, index) => {
                                        const isSelected = selectedItemIds.has(item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                className={`rounded-2xl border p-4 transition-all ${
                                                    !item.isValid
                                                        ? 'border-rose-300 bg-rose-50/20'
                                                        : isSelected
                                                        ? 'border-emerald-300 bg-emerald-50/10 shadow-xs'
                                                        : 'border-slate-200 bg-white opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Checkbox */}
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelect(item.id)}
                                                        disabled={!item.isValid}
                                                        className="mt-1 h-4 w-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    />

                                                    {/* Main content inputs */}
                                                    <div className="flex-1 space-y-2 text-xs">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                                                    #{index + 1}
                                                                    {item.sourceIndex ? ` (${item.sourceIndex})` : ''}
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    value={item.category}
                                                                    onChange={(e) =>
                                                                        handleItemChange(item.id, 'category', e.target.value)
                                                                    }
                                                                    placeholder="Danh mục..."
                                                                    className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 focus:border-emerald-500"
                                                                />
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleItemChange(item.id, 'isPinned', !item.isPinned)
                                                                    }
                                                                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                                                                        item.isPinned
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    <Pin className={`h-3 w-3 ${item.isPinned ? 'fill-current' : ''}`} />
                                                                    <span>{item.isPinned ? 'Được ghim' : 'Chưa ghim'}</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveItem(item.id)}
                                                                    className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                                    title="Xóa câu này khỏi danh sách nhập"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Question Input */}
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600">
                                                                Câu hỏi:
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={item.question}
                                                                onChange={(e) =>
                                                                    handleItemChange(item.id, 'question', e.target.value)
                                                                }
                                                                placeholder="Nhập câu hỏi..."
                                                                className={`mt-0.5 w-full rounded-xl border px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-hidden ${
                                                                    !item.question.trim()
                                                                        ? 'border-rose-400 bg-rose-50/50'
                                                                        : 'border-slate-200 focus:border-emerald-500'
                                                                }`}
                                                            />
                                                        </div>

                                                        {/* Answer Textarea */}
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600">
                                                                Câu trả lời:
                                                            </label>
                                                            <textarea
                                                                rows={2}
                                                                value={item.answer}
                                                                onChange={(e) =>
                                                                    handleItemChange(item.id, 'answer', e.target.value)
                                                                }
                                                                placeholder="Nhập câu trả lời chi tiết..."
                                                                className={`mt-0.5 w-full rounded-xl border p-2 text-xs leading-relaxed text-slate-700 focus:outline-hidden ${
                                                                    !item.answer.trim()
                                                                        ? 'border-rose-400 bg-rose-50/50'
                                                                        : 'border-slate-200 focus:border-emerald-500'
                                                                }`}
                                                            />
                                                        </div>

                                                        {item.errorReason && (
                                                            <p className="text-[11px] font-semibold text-rose-600">
                                                                ⚠️ {item.errorReason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {submitError && (
                                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                    <span>{submitError}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                {submitSuccessCount === null && (
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                        {step === 1 ? (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Đóng
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    disabled={!selectedFile || isParsing || parsedItems.length === 0}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                >
                                    <span>Xem trước ({parsedItems.length} câu)</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    <span>Quay lại tệp</span>
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                    >
                                        Hủy bỏ
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || selectedCount === 0}
                                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Đang lưu câu hỏi...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Xác nhận nhập {selectedCount} câu hỏi FAQ</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
