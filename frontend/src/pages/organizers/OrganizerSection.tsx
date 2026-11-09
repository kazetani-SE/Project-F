import { useCallback, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { button, ErrorNotice, field, Loading, Pagination, panel, RetryNotice, secondary } from '../../components/ui/CrudUi';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { useSuccessToast } from '../../components/ui/toastContext';
import { ORGANIZER_ROLE_LABEL } from '../../constants/enum/event';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { useMutation } from '../../hooks/useMutation';
import { useResource } from '../../hooks/useResource';
import { eventService } from '../../services/eventService';
import { memberService } from '../../services/memberService';
import type { OrganizerRole, OrganizerFields, OrganizerResponse } from '../../types/models/event';

function AssignForm({ assigned, onAssign, onClose }: {
    assigned: OrganizerResponse[]; onAssign: (data: OrganizerFields) => Promise<void>; onClose: () => void;
}) {
    const [query, setQuery] = useState({ keyword: '', page: 0 });
    const members = useResource(useCallback(() => memberService.list({
        keyword: query.keyword || undefined, page: query.page, size: 20, isActive: true, sort: 'fullName,asc',
    }), [query]));
    const { busy, error, mutate } = useMutation();
    const choices = members.data?.items.filter((member) => !assigned.some((item) => item.memberId === member.id)) ?? [];

    function assign(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void mutate(() => onAssign({
            memberId: String(data.get('memberId')),
            role: data.get('role') as OrganizerRole,
            assignedTasks: String(data.get('assignedTasks')).trim() || null,
        }));
    }

    return <div className="space-y-4 rounded-lg border border-slate-200 p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
            event.preventDefault();
            setQuery({ keyword: String(new FormData(event.currentTarget).get('keyword')).trim(), page: 0 });
        }}>
            <label>Tìm thành viên<input className={field} name="keyword" /></label>
            <button className={secondary} disabled={busy}>Tìm</button>
        </form>
        {members.isLoading && <Loading />}
        <RetryNotice error={members.error} onRetry={members.reload} />
        <ErrorNotice error={error} />
        <form className="space-y-3" onSubmit={assign}>
            <div className="grid gap-3 sm:grid-cols-2">
                <label>Thành viên<select className={field} name="memberId" required>
                    <option value="">Chọn thành viên</option>
                    {choices.map((member) => <option key={member.id} value={member.id}>{member.fullName} · {member.studentId}</option>)}
                </select></label>
                <label>Vai trò BTC<select className={field} name="role" defaultValue="MEMBER">
                    {Object.entries(ORGANIZER_ROLE_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select></label>
            </div>
            {members.data && <Pagination pageData={members.data} onChange={(page) => setQuery({ ...query, page })} />}
            <label className="block">Nhiệm vụ được giao<textarea className={field} name="assignedTasks" rows={2} /></label>
            <div className="flex gap-3">
                <button className={button} disabled={busy || !choices.length}>Phân công</button>
                <button className={secondary} type="button" disabled={busy} onClick={onClose}>Hủy</button>
            </div>
        </form>
    </div>;
}

export function OrganizerSection({ eventId, admin }: { eventId: string; admin: boolean }) {
    const resource = useResource(useCallback(() => eventService.organizers(eventId), [eventId]));
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<OrganizerResponse | null>(null);
    const removal = useMutation();
    const notify = useSuccessToast();

    return <section className={`${panel} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Ban tổ chức</h2>
            {admin && resource.data && !adding && <button className={button} onClick={() => setAdding(true)}>Thêm thành viên BTC</button>}
        </div>
        {resource.isLoading && <Loading />}
        <RetryNotice error={resource.error} onRetry={resource.reload} />
        {resource.data && (resource.data.length ? <ul className="divide-y divide-slate-100">
            {resource.data.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.memberName}</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{ORGANIZER_ROLE_LABEL[item.role]}</span>
                    </div>
                    {item.assignedTasks && <p className="whitespace-pre-line text-sm text-slate-600">{item.assignedTasks}</p>}
                </div>
                {admin && <button className={secondary} aria-label={`Xóa ${item.memberName} khỏi BTC`}
                    onClick={() => setRemoving(item)}>Xóa</button>}
            </li>)}
        </ul> : <p>Chưa có thành viên ban tổ chức.</p>)}
        {admin && adding && resource.data && <AssignForm assigned={resource.data} onClose={() => setAdding(false)} onAssign={async (data) => {
            await eventService.assign(eventId, data);
            resource.reload();
            setAdding(false);
            notify('Đã phân công thành viên BTC.');
        }} />}
        {admin && removing && <ConfirmationDialog title="Xóa thành viên BTC"
            message={`Bạn có muốn xóa ${removing.memberName} khỏi ban tổ chức?`}
            busy={removal.busy} error={removal.error} onCancel={() => setRemoving(null)}
            onConfirm={() => void removal.mutate(async () => {
                await eventService.remove(eventId, removing.memberId);
                resource.reload();
                setRemoving(null);
                notify('Đã xóa thành viên khỏi BTC.');
            })} />}
    </section>;
}

export function OrganizersPage() {
    const { eventId = '' } = useParams();
    const { user } = useAuth();
    return <OrganizerSection key={eventId} eventId={eventId} admin={isClubAdmin(user?.clubRole)} />;
}
