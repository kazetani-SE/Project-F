import { useState } from 'react';
import { Download, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import { button, panel, secondary } from '../../components/ui/CrudUi';
import { memberService } from '../../services/memberService';
import type { MemberImportReport, MemberImportRow } from '../../types/models/member';

const headers = ['studentId', 'fullName', 'email', 'phone', 'department', 'batch'];

function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}

function exportRows(rows: MemberImportRow[]) {
    return rows.map((row) => ({
        'Dòng Excel': row.rowNumber, MSSV: row.studentId, 'Họ tên': row.fullName,
        Email: row.email, 'Điện thoại': row.phone, Ban: row.department,
        Khóa: row.batch, 'Trạng thái': row.status, 'Lý do': row.reason,
        'ID thành viên': row.memberId ?? '',
    }));
}

export function MemberImportPanel({ onImported }: { onImported: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [count, setCount] = useState<number | null>(null);
    const [report, setReport] = useState<MemberImportReport | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function preview(selected: File) {
        setFile(selected);
        setReport(null);
        setError('');
        try {
            if (!selected.name.toLowerCase().endsWith('.xlsx') || selected.size > 1024 * 1024) throw new Error('Chỉ nhận .xlsx tối đa 1 MB.');
            const book = XLSX.read(await selected.arrayBuffer(), { type: 'array' });
            const sheet = book.Sheets['Thành viên'];
            if (!sheet) throw new Error('Thiếu sheet Thành viên.');
            const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
            if (headers.some((header, index) => rows[0]?.[index] !== header)) throw new Error('Tiêu đề cột không đúng file mẫu.');
            const dataRows = rows.slice(1).filter((row) => Array.isArray(row) && row.some((value) => value !== '' && value != null));
            if (dataRows.length > 100) throw new Error('Tối đa 100 dòng dữ liệu.');
            setCount(dataRows.length);
        } catch (failure) {
            setCount(null);
            setError(failure instanceof Error ? failure.message : 'Không đọc được file.');
        }
    }

    async function run() {
        if (!file || !count) return;
        setBusy(true);
        setError('');
        try {
            const result = await memberService.importFile(file);
            setReport(result);
            onImported();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Import thất bại.');
        } finally {
            setBusy(false);
        }
    }

    function saveReport() {
        if (!report) return;
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(exportRows(report.rows.filter((row) =>
            row.status === 'CREATED' || row.status === 'AUTH_EXISTS'))), 'Thành công');
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(exportRows(report.rows.filter((row) =>
            row.status !== 'CREATED' && row.status !== 'AUTH_EXISTS'))), 'Thất bại');
        XLSX.writeFile(book, 'ket-qua-import-thanh-vien.xlsx');
    }

    function updateResult(rowNumber: number, status: MemberImportRow['status'], reason: string) {
        setReport((previous) => {
            if (!previous) return previous;
            const rows = previous.rows.map((row) => row.rowNumber === rowNumber ? { ...row, status, reason } : row);
            return { ...previous, rows,
                failed: rows.filter((row) => row.status !== 'CREATED' && row.status !== 'AUTH_EXISTS').length,
                existingAuth: rows.filter((row) => row.status === 'AUTH_EXISTS').length,
                emailFailed: rows.filter((row) => row.status === 'EMAIL_FAILED').length };
        });
    }

    return <section className={`${panel} space-y-3`} aria-label="Import thành viên">
        <h2 className="font-semibold">Import thành viên từ Excel</h2>
        <p className="text-sm">Tối đa 100 dòng. Thành viên mới có vai trò MEMBER; mật khẩu tài khoản mới được gửi qua email.</p>
        <div className="flex flex-wrap items-center gap-3">
            <button className={`${secondary} inline-flex items-center gap-2`} type="button" onClick={async () => {
                try { download(await memberService.template(), 'club-members-template.xlsx'); } catch { setError('Không tải được file mẫu.'); }
            }}><Download className="h-4 w-4" aria-hidden="true" />Tải file mẫu</button>
            <input id="member-import-file" className="peer sr-only" type="file" accept=".xlsx" onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void preview(selected);
            }} />
            <label htmlFor="member-import-file" className={`${secondary} inline-flex cursor-pointer items-center gap-2 text-emerald-700 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700`}>
                <UploadCloud className="h-4 w-4" aria-hidden="true" />Chọn file Excel
            </label>
        </div>
        {count !== null && <p>Đã chọn {count} dòng dữ liệu từ {file?.name}.</p>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button className={button} type="button" disabled={busy || !count} onClick={() => {
            if (window.confirm(`Import ${count} thành viên và gửi email cấp tài khoản?`)) void run();
        }}>{busy ? 'Đang import và gửi email…' : 'Xác nhận import'}</button>
        {report && <div className="space-y-2" role="status">
            <p>Tổng {report.total}; đã tạo {report.created}; lỗi {report.failed}; Auth đã có {report.existingAuth}; gửi mail lỗi {report.emailFailed}.</p>
            <button className={secondary} type="button" onClick={saveReport}>Tải kết quả Excel</button>
            {report.rows.filter((row) => row.reason).map((row) => <div key={row.rowNumber} className="flex gap-2">
                <p>Dòng {row.rowNumber}: {row.reason}</p>
                {row.status === 'EMAIL_FAILED' && row.memberId && <button className={secondary} type="button" onClick={async () => {
                    if (!window.confirm('Gửi lại sẽ tạo mật khẩu mới, mật khẩu cũ hết hiệu lực. Tiếp tục?')) return;
                    try {
                        await memberService.resendCredentials(row.memberId!);
                        updateResult(row.rowNumber, 'CREATED', 'Đã gửi lại email');
                    } catch { setError('Gửi lại email thất bại.'); }
                }}>Gửi lại email</button>}
                {row.status === 'AUTH_FAILED' && row.memberId && <button className={secondary} type="button" onClick={async () => {
                    try {
                        const status = await memberService.provisionCredentials(row.memberId!);
                        const reason = status === 'AUTH_EXISTS' ? 'Tài khoản Auth đã có; giữ nguyên mật khẩu hiện tại'
                            : status === 'EMAIL_FAILED' ? 'Đã tạo tài khoản nhưng gửi email thất bại; dùng chức năng gửi lại'
                                : 'Đã cấp tài khoản và gửi email';
                        updateResult(row.rowNumber, status, reason);
                    } catch { setError('Cấp tài khoản thất bại. Vui lòng thử lại.'); }
                }}>Thử cấp tài khoản</button>}
            </div>)}
        </div>}
    </section>;
}
