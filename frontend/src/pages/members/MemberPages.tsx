import { useCallback, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { button, ErrorNotice, field, link, Loading, PageHeader, Pagination, panel, RetryNotice, secondary } from '../../components/ui/CrudUi';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { useSuccessToast } from '../../components/ui/toastContext';
import { ROUTE_PATHS, ROUTES } from '../../app/router/route';
import { DEPARTMENT_LABEL } from '../../constants/enum/member';
import { CLUB_ROLE_LABEL } from '../../constants/enum/role';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { useMutation } from '../../hooks/useMutation';
import { useResource } from '../../hooks/useResource';
import { memberService } from '../../services/memberService';
import type { ClubRole } from '../../types/models/auth';
import type { Department, MemberFields, MemberQuery, MemberResponse } from '../../types/models/member';

const initialQuery: MemberQuery = { page: 0, size: 20, sort: 'fullName,asc' };
const roleOptions = Object.entries(CLUB_ROLE_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>);
const departmentOptions = Object.entries(DEPARTMENT_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>);

export function MembersPage() {
    const { user } = useAuth();
    const [query, setQuery] = useState(initialQuery);
    const resource = useResource(useCallback(() => memberService.list(query), [query]));

    function filter(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const active = data.get('isActive');
        setQuery({
            page: 0, size: Number(data.get('size')), sort: String(data.get('sort')),
            keyword: String(data.get('keyword')).trim() || undefined,
            department: (data.get('department') as Department) || undefined,
            role: (data.get('role') as ClubRole) || undefined,
            batch: String(data.get('batch')).trim() || undefined,
            isActive: active ? active === 'true' : undefined,
        });
    }

    return <section className="space-y-5">
        <PageHeader title="Thành viên CLB" action={isClubAdmin(user?.clubRole) && <Link className={button} to={ROUTE_PATHS.MEMBER_NEW}>Thêm thành viên</Link>} />
        <form className={`${panel} grid gap-3 sm:grid-cols-2 xl:grid-cols-4`} onSubmit={filter}>
            <label>Từ khóa<input className={field} name="keyword" placeholder="Tên, email hoặc MSSV" /></label>
            <label>Ban<select className={field} name="department"><option value="">Tất cả</option>{departmentOptions}</select></label>
            <label>Vai trò<select className={field} name="role"><option value="">Tất cả</option>{roleOptions}</select></label>
            <label>Khóa<input className={field} name="batch" maxLength={4} /></label>
            <label>Trạng thái<select className={field} name="isActive">
                <option value="">Tất cả</option><option value="true">Đang hoạt động</option><option value="false">Ngừng hoạt động</option>
            </select></label>
            <label>Sắp xếp<select className={field} name="sort">
                <option value="fullName,asc">Tên A–Z</option><option value="fullName,desc">Tên Z–A</option><option value="createdAt,desc">Mới nhất</option>
            </select></label>
            <label>Số dòng<select className={field} name="size" defaultValue={20}>
                <option value="10">10</option><option value="20">20</option><option value="50">50</option>
            </select></label>
            <div className="self-end"><button className={button}>Lọc danh sách</button></div>
        </form>
        {resource.isLoading && <Loading />}
        <RetryNotice error={resource.error} onRetry={resource.reload} />
        {resource.data && (resource.data.items.length ? <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50"><tr>{['Họ và tên', 'MSSV', 'Email', 'Ban', 'Vai trò', 'Khóa', 'Trạng thái'].map((header) =>
                    <th scope="col" className="px-4 py-3" key={header}>{header}</th>)}</tr></thead>
                <tbody>{resource.data.items.map((member) => <tr className="border-t border-slate-100" key={member.id}>
                    <td className="px-4 py-3"><Link className={link} to={ROUTES.member(member.id)}>{member.fullName}</Link></td>
                    <td className="px-4 py-3">{member.studentId}</td><td className="px-4 py-3">{member.email}</td>
                    <td className="px-4 py-3">{member.department ? DEPARTMENT_LABEL[member.department] : '—'}</td>
                    <td className="px-4 py-3">{CLUB_ROLE_LABEL[member.clubRole]}</td><td className="px-4 py-3">{member.batch}</td>
                    <td className="px-4 py-3">{member.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</td>
                </tr>)}</tbody>
            </table>
        </div> : <p>Không tìm thấy thành viên.</p>)}
        {resource.data && <Pagination pageData={resource.data} onChange={(page) => setQuery({ ...query, page })} />}
    </section>;
}

function MemberForm({ member, save, onCancel }: {
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

export function NewMemberPage() {
    const navigate = useNavigate();
    const notify = useSuccessToast();
    return <section className="space-y-5">
        <PageHeader title="Thêm thành viên" />
        <MemberForm onCancel={() => navigate(ROUTE_PATHS.MEMBERS)} save={async (fields, studentId) => {
            const member = await memberService.create({ ...fields, studentId });
            notify('Đã thêm thành viên.');
            navigate(ROUTES.member(member.id));
        }} />
    </section>;
}

export function MemberDetailPage() {
    const { id = '' } = useParams();
    return <MemberDetail key={id} id={id} />;
}

function MemberDetail({ id }: { id: string }) {
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
