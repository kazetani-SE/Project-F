import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { button, link, Loading, PageHeader, panel, RetryNotice, secondary } from '../../../components/ui/CrudUi';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
import { useSuccessToast } from '../../../components/ui/toastContext';
import { MemberForm } from './MemberForm';
import { ROUTE_PATHS } from '../../../app/router/route';
import { DEPARTMENT_LABEL } from '../../../constants/enum/member';
import { CLUB_ROLE_LABEL } from '../../../constants/enum/role';
import { isClubAdmin, useAuth } from '../../../context/authContext';
import { useMutation } from '../../../hooks/useMutation';
import { useResource } from '../../../hooks/useResource';
import { memberService } from '../../../services/memberService';

export function MemberDetail({ id }: { id: string }) {
    const { user, retry } = useAuth();
    const admin = isClubAdmin(user?.clubRole);
    const resource = useResource(useCallback(() => memberService.get(id), [id]));
    const status = useMutation();
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const notify = useSuccessToast();
    if (resource.isLoading) return <Loading />;
    if (!resource.data) return <RetryNotice error={resource.error} onRetry={resource.reload} />;

    const member = resource.data;
    const facts = [
        ['MSSV', member.studentId], ['Email', member.email], ['Điện thoại', member.phone],
        ['Ban', member.department && DEPARTMENT_LABEL[member.department]], ['Vai trò', CLUB_ROLE_LABEL[member.clubRole]],
        ['Khóa', member.batch], ['Trạng thái', member.active ? 'Đang hoạt động' : 'Ngừng hoạt động'],
    ];

    return <section className="space-y-5">
        <Link className={link} to={ROUTE_PATHS.MEMBERS}>Danh sách thành viên</Link>
        <PageHeader title={member.fullName} action={admin && !editing && <button className={button} disabled={status.busy} onClick={() => setEditing(true)}>Chỉnh sửa</button>} />
        {editing && admin ? <MemberForm member={member} onCancel={() => setEditing(false)} save={async (data) => {
            const updated = await memberService.update(id, data);
            resource.replace(updated);
            setEditing(false);
            notify('Đã cập nhật thành viên.');
            if (user?.id === id && user.clubRole !== updated.clubRole) retry();
        }} /> : <dl className={`${panel} grid gap-4 sm:grid-cols-2`}>
            {facts.map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd>{value ?? '—'}</dd></div>)}
        </dl>}
        {admin && !editing && <>
            <button className={secondary} onClick={() => setConfirming(true)}>
                {member.active ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
            </button>
            {confirming && <ConfirmationDialog
                title={member.active ? 'Ngừng hoạt động thành viên' : 'Kích hoạt lại thành viên'}
                message={`Bạn có muốn ${member.active ? 'ngừng hoạt động' : 'kích hoạt lại'} thành viên ${member.fullName}?`}
                busy={status.busy} error={status.error}
                onCancel={() => setConfirming(false)} onConfirm={() => void status.mutate(async () => {
                    resource.replace(await memberService.updateStatus(id, !member.active));
                    setConfirming(false);
                    notify(member.active ? 'Đã ngừng hoạt động thành viên.' : 'Đã kích hoạt lại thành viên.');
                    if (user?.id === id) retry();
                })}
            />}
        </>}
    </section>;
}
