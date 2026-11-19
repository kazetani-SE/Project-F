import { useParams } from 'react-router-dom';
import { MemberDetail } from '../../components/members/MemberDetail';

export function MemberDetailPage() {
    const { id = '' } = useParams();
    return <MemberDetail key={id} id={id} />;
}
