import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import { useAuth } from '../../context/authContext';
import { useMutation } from '../../hooks/useMutation';
import { ErrorNotice } from '../ui/CrudUi';

export function LogoutButton() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const { busy, error, mutate } = useMutation();
    return <div>
        <button className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            disabled={busy} onClick={() => void mutate(async () => {
                await signOut();
                navigate(ROUTE_PATHS.LOGIN, { replace: true });
            })}>Đăng xuất</button>
        <ErrorNotice error={error} />
    </div>;
}
