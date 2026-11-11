// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as XLSX from 'xlsx';
import { MemberImportPanel } from '../../src/pages/members/MemberImportPanel';
import { memberService } from '../../src/services/memberService';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('previews a workbook and shows the per-row import result', async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
        ['studentId', 'fullName', 'email', 'phone', 'department', 'batch'],
        ['SE123456', 'Nguyễn Văn A', 'a@example.test', '', 'PLAN', 'K26'],
    ]), 'Thành viên');
    const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
    const file = new File([bytes], 'members.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(bytes);
    const report = { total: 1, created: 1, failed: 0, existingAuth: 0, emailFailed: 0,
        rows: [{ rowNumber: 2, studentId: 'SE123456', fullName: 'Nguyễn Văn A', email: 'a@example.test',
            phone: '', department: 'PLAN', batch: 'K26', status: 'CREATED' as const, reason: '', memberId: 'member-1' }] };
    const importFile = vi.spyOn(memberService, 'importFile').mockResolvedValue(report);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onImported = vi.fn();
    render(<MemberImportPanel onImported={onImported} />);
    await userEvent.upload(screen.getByLabelText('Chọn file Excel'), file);
    expect(await screen.findByText(/Đã chọn 1 dòng dữ liệu/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận import' }));
    expect(await screen.findByText(/Tổng 1; đã tạo 1; lỗi 0/)).toBeTruthy();
    expect(importFile).toHaveBeenCalledWith(file);
    expect(onImported).toHaveBeenCalledOnce();
});
