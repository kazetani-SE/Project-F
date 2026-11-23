import { button, ErrorNotice, field, panel, secondary } from '../../../components/ui/CrudUi';
import { CLUB_ROLE_LABEL } from '../../../constants/enum/role';
import { DEPARTMENT_LABEL } from '../../../constants/enum/member';
import { useMutation } from '../../../hooks/useMutation';
import type { ClubRole } from '../../../types/models/auth';
import type { Department, MemberFields, MemberResponse } from '../../../types/models/member';

const roleOptions = Object.entries(CLUB_ROLE_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>);
const departmentOptions = Object.entries(DEPARTMENT_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>);

export function MemberForm({ member, save, onCancel }: {
    member?: MemberResponse; save: (data: MemberFields, studentId: string) => Promise<void>; onCancel: () => void;
}) {
    const { busy, error, mutate } = useMutation();
    return <form className={`${panel} space-y-4`} onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void mutate(() => save({
            fullName: String(data.get('fullName')).trim(),
            email: String(data.get('email')).trim(),
            phone: String(data.get('phone')).trim() || null,
            department: (data.get('department') as Department) || null,
            clubRole: data.get('clubRole') as ClubRole,
            batch: String(data.get('batch')).trim(),
        }, String(data.get('studentId') ?? '').trim()));
    }}>
        <ErrorNotice error={error} />
        <div className="grid gap-4 sm:grid-cols-2">
            <label>MSSV<input className={field} name="studentId" defaultValue={member?.studentId} minLength={8} maxLength={8} required readOnly={!!member} /></label>
            <label>Họ và tên<input className={field} name="fullName" defaultValue={member?.fullName} maxLength={100} required /></label>
            <label>Email<input className={field} name="email" type="email" defaultValue={member?.email} maxLength={100} required /></label>
            <label>Điện thoại<input className={field} name="phone" type="tel" defaultValue={member?.phone ?? ''} maxLength={15} /></label>
            <label>Ban<select className={field} name="department" defaultValue={member?.department ?? ''}>
                <option value="">Chọn ban</option>{departmentOptions}
            </select></label>
            <label>Vai trò<select className={field} name="clubRole" defaultValue={member?.clubRole ?? 'MEMBER'}>{roleOptions}</select></label>
            <label>Khóa<input className={field} name="batch" defaultValue={member?.batch} maxLength={4} required /></label>
        </div>
        <div className="flex gap-3">
            <button className={button} disabled={busy}>Lưu thành viên</button>
            <button className={secondary} type="button" disabled={busy} onClick={onCancel}>Hủy</button>
        </div>
    </form>;
}
