import { useCallback, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { button, field, link, Loading, PageHeader, Pagination, panel, RetryNotice } from '../../components/ui/CrudUi';
import { MemberImportPanel } from './components/MemberImportPanel';
import { ROUTE_PATHS, ROUTES } from '../../app/router/route';
import { DEPARTMENT_LABEL } from '../../constants/enum/member';
import { CLUB_ROLE_LABEL } from '../../constants/enum/role';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { useResource } from '../../hooks/useResource';
import { memberService } from '../../services/memberService';
import type { ClubRole } from '../../types/models/auth';
import type { Department, MemberQuery } from '../../types/models/member';

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
        {isClubAdmin(user?.clubRole) && <MemberImportPanel onImported={resource.reload} />}
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
