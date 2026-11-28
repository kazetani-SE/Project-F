import { LogOut } from 'lucide-react';
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
        <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            disabled={busy} onClick={() => void mutate(async () => {
                await signOut();
                navigate(ROUTE_PATHS.LOGIN, { replace: true });
            })}>
            <LogOut aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
            {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </button>
        <ErrorNotice error={error} />
    </div>;
}
