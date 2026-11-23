import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/CrudUi';
import { MemberForm } from './components/MemberForm';
import { useSuccessToast } from '../../components/ui/toastContext';
import { ROUTE_PATHS, ROUTES } from '../../app/router/route';
import { memberService } from '../../services/memberService';

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
