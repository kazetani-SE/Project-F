import * as XLSX from 'xlsx';
import type { BudgetCategory, CreateBudgetItemRequest } from '../../../../types/models/finance';

export interface ParsedBudgetItemRow {
    rowIndex: number;
    itemName: string;
    categoryName: string;
    categoryId?: string;
    quantity: number;
    unit: string;
    estUnitPrice: number;
    totalAmount: number;
    supplierName?: string;
    supplierLink?: string;
    notes?: string;
    isValid: boolean;
    errorMessage?: string;
    request?: CreateBudgetItemRequest;
}

function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/**
 * Xuất file Excel mẫu (template) để người dùng nhập nhiều budget item cùng lúc.
 */
export function exportBudgetItemTemplate(categories: BudgetCategory[] = []) {
    const wb = XLSX.utils.book_new();

    // 1. Sheet dữ liệu mẫu: Du_Tru_Ngan_Sach
    const sampleCategory1 = categories[0]?.name || 'Hậu cần';
    const sampleCategory2 = categories[1]?.name || 'Truyền thông';

    const headers = [
        'Tên hạng mục (*)',
        'Danh mục kinh phí (*)',
        'Số lượng (*)',
        'Đơn vị tính (*)',
        'Đơn giá dự kiến (VNĐ) (*)',
        'Nhà cung cấp / Nơi bán',
        'Đường dẫn tham khảo (Link)',
        'Ghi chú',
    ];

    const sampleRows = [
        [
            'In Standee chân cuốn 0.8m x 1.8m',
            sampleCategory2,
            2,
            'Cái',
            180000,
            'Nhà in FPT',
            'https://example.com/standee',
            'In bạt hiflex chất lượng cao cho sân khấu',
        ],
        [
            'Nước suối đóng chai Aquafina 500ml',
            sampleCategory1,
            5,
            'Thùng',
            95000,
            'Bách Hóa Xanh',
            '',
            'Phục vụ khách mời và ban tổ chức',
        ],
        [
            'Băng rôn chào mừng đại biểu 1m x 6m',
            sampleCategory2,
            1,
            'Tấm',
            350000,
            'Xưởng in 24h',
            '',
            'Treo cổng chính lối vào hội trường',
        ],
    ];

    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Định dạng độ rộng cột cho đẹp
    ws['!cols'] = [
        { wch: 35 }, // Tên hạng mục
        { wch: 22 }, // Danh mục
        { wch: 12 }, // Số lượng
        { wch: 14 }, // Đơn vị
        { wch: 25 }, // Đơn giá
        { wch: 25 }, // Nhà cung cấp
        { wch: 30 }, // Link
        { wch: 35 }, // Ghi chú
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Du_Tru_Ngan_Sach');

    // 2. Sheet danh mục tham chiếu: Danh_Muc_Tham_Chieu
    const categoryHeaders = ['Mã danh mục (ID)', 'Tên danh mục kinh phí', 'Mô tả'];
    const categoryRows = categories.map((c) => [c.id, c.name, c.description || '']);
    const wsCategories = XLSX.utils.aoa_to_sheet([categoryHeaders, ...categoryRows]);

    wsCategories['!cols'] = [
        { wch: 38 }, // ID
        { wch: 25 }, // Tên
        { wch: 40 }, // Mô tả
    ];

    XLSX.utils.book_append_sheet(wb, wsCategories, 'Danh_Muc_Tham_Chieu');

    // Tạo blob và tải về
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    downloadBlob(blob, 'Template_Nhap_Du_Tru_Ngan_Sach.xlsx');
}

/**
 * Đọc file Excel người dùng tải lên và chuyển thành danh sách ParsedBudgetItemRow
 */
export async function parseBudgetItemExcel(
    file: File,
    categories: BudgetCategory[],
): Promise<ParsedBudgetItemRow[]> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    // Ưu tiên sheet 'Du_Tru_Ngan_Sach', nếu không có thì lấy sheet đầu tiên
    const sheetName = wb.SheetNames.includes('Du_Tru_Ngan_Sach')
        ? 'Du_Tru_Ngan_Sach'
        : wb.SheetNames[0];

    if (!sheetName) {
        throw new Error('File Excel không có bất kỳ sheet nào.');
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) {
        throw new Error(`Không tìm thấy sheet "${sheetName}".`);
    }

    // Đọc dạng mảng mảng (AOA)
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });

    if (rawRows.length < 2) {
        throw new Error('File Excel không có dữ liệu để nhập (cần có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu).');
    }

    // Map cột từ dòng header (dòng 0)
    const headerRow = (rawRows[0] || []).map((h) => String(h || '').trim().toLowerCase());

    const findIndex = (keywords: string[]) => {
        return headerRow.findIndex((col) => keywords.some((k) => col.includes(k)));
    };

    const colItemName = findIndex(['tên hạng mục', 'itemname', 'hạng mục']);
    const colCategory = findIndex(['danh mục', 'category']);
    const colQty = findIndex(['số lượng', 'quantity', 'sl']);
    const colUnit = findIndex(['đơn vị', 'unit', 'đvt']);
    const colUnitPrice = findIndex(['đơn giá', 'unitprice', 'giá']);
    const colSupplierName = findIndex(['nhà cung cấp', 'nơi bán', 'supplier']);
    const colSupplierLink = findIndex(['đường dẫn', 'link', 'url']);
    const colNotes = findIndex(['ghi chú', 'notes', 'mô tả']);

    if (colItemName === -1 || colQty === -1 || colUnitPrice === -1) {
        throw new Error(
            'File không đúng cấu trúc mẫu. Cần có tối thiểu các cột: "Tên hạng mục", "Số lượng", "Đơn giá dự kiến".',
        );
    }

    const categoryMap = new Map<string, BudgetCategory>();
    for (const c of categories) {
        categoryMap.set(c.id.toLowerCase(), c);
        categoryMap.set(c.name.toLowerCase().trim(), c);
    }

    const parsedResults: ParsedBudgetItemRow[] = [];

    // Duyệt từ dòng 1 (bỏ dòng header)
    for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!Array.isArray(row) || row.every((cell) => cell === '' || cell == null)) {
            continue; // Bỏ qua dòng trống
        }

        const rawItemName = String(row[colItemName] ?? '').trim();
        const rawCategory = colCategory !== -1 ? String(row[colCategory] ?? '').trim() : '';
        const rawQty = row[colQty];
        const rawUnit = colUnit !== -1 ? String(row[colUnit] ?? '').trim() : 'Cái';
        const rawUnitPrice = row[colUnitPrice];
        const rawSupplier = colSupplierName !== -1 ? String(row[colSupplierName] ?? '').trim() : '';
        const rawLink = colSupplierLink !== -1 ? String(row[colSupplierLink] ?? '').trim() : '';
        const rawNotes = colNotes !== -1 ? String(row[colNotes] ?? '').trim() : '';

        const errors: string[] = [];

        // 1. Kiểm tra Tên hạng mục
        if (!rawItemName) {
            errors.push('Tên hạng mục không được để trống.');
        } else if (rawItemName.length > 200) {
            errors.push('Tên hạng mục tối đa 200 ký tự.');
        }

        // 2. Kiểm tra Số lượng
        const qtyNum = Number(rawQty);
        if (rawQty == null || isNaN(qtyNum) || qtyNum <= 0) {
            errors.push('Số lượng phải là số lớn hơn 0.');
        }

        // 3. Kiểm tra Đơn vị tính
        const unitVal = rawUnit || 'Cái';
        if (unitVal.length > 30) {
            errors.push('Đơn vị tính tối đa 30 ký tự.');
        }

        // 4. Kiểm tra Đơn giá
        const priceNum = Number(rawUnitPrice);
        if (rawUnitPrice == null || isNaN(priceNum) || priceNum < 0) {
            errors.push('Đơn giá dự kiến phải là số không âm.');
        }

        // 5. Kiểm tra Danh mục
        let matchedCategory: BudgetCategory | undefined = undefined;
        if (rawCategory) {
            matchedCategory = categoryMap.get(rawCategory.toLowerCase());
        }
        if (!matchedCategory && categories.length > 0) {
            // Nếu không ghi hoặc không khớp thì lấy danh mục đầu tiên hoặc báo lỗi
            matchedCategory = categories[0];
        }

        if (!matchedCategory) {
            errors.push('Chưa chọn danh mục kinh phí hợp lệ.');
        }

        // 6. Kiểm tra Link
        let validLink: string | undefined = undefined;
        if (rawLink) {
            try {
                const url = new URL(rawLink);
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                    validLink = rawLink;
                } else {
                    errors.push('Đường dẫn link phải bắt đầu bằng http:// hoặc https://');
                }
            } catch {
                errors.push('Đường dẫn link không hợp lệ.');
            }
        }

        const isValid = errors.length === 0;
        const totalAmount = (isNaN(qtyNum) ? 0 : qtyNum) * (isNaN(priceNum) ? 0 : priceNum);

        parsedResults.push({
            rowIndex: i + 1,
            itemName: rawItemName,
            categoryName: matchedCategory?.name || rawCategory || 'Chưa phân loại',
            categoryId: matchedCategory?.id,
            quantity: isNaN(qtyNum) ? 0 : qtyNum,
            unit: unitVal,
            estUnitPrice: isNaN(priceNum) ? 0 : priceNum,
            totalAmount,
            supplierName: rawSupplier || undefined,
            supplierLink: validLink,
            notes: rawNotes || undefined,
            isValid,
            errorMessage: errors.join(' '),
            request: isValid && matchedCategory
                ? {
                      categoryId: matchedCategory.id,
                      itemName: rawItemName,
                      quantity: qtyNum,
                      unit: unitVal,
                      estUnitPrice: priceNum,
                      supplierName: rawSupplier || undefined,
                      supplierLink: validLink,
                      notes: rawNotes || undefined,
                  }
                : undefined,
        });
    }

    return parsedResults;
}
