import { Link, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import { useAuth } from '../../context/authContext';
import { useMutation } from '../../hooks/useMutation';
import { button, ErrorNotice, field, link, Loading } from '../../components/ui/CrudUi';
import { AuthCard } from './AuthCard';

export function ResetPasswordPage() {
    const { recovery, isLoading, updatePassword, signOut } = useAuth();
    const navigate = useNavigate();
    const { busy, error, mutate } = useMutation();
    return <AuthCard title="Đặt lại mật khẩu">
        {isLoading ? <Loading /> : (recovery || busy) ? <>
            <ErrorNotice error={error} />
            <form className="space-y-4" onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void mutate(async () => {
                    const password = String(values.get('password'));
                    if (password !== values.get('confirm')) throw new Error('Mật khẩu xác nhận không khớp.');
                    await updatePassword(password);
                    navigate(ROUTE_PATHS.LOGIN, { replace: true, state: { passwordUpdated: true } });
                });
            }}>
                <label className="block">Mật khẩu mới<input className={field} type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
                <label className="block">Xác nhận mật khẩu<input className={field} type="password" name="confirm" autoComplete="new-password" minLength={8} required /></label>
                <div className="flex flex-wrap items-center gap-3">
                    <button className={button} disabled={busy}>Lưu mật khẩu</button>
                    <button type="button" className={link} disabled={busy} onClick={() => void mutate(async () => {
                        await signOut();
                        navigate(ROUTE_PATHS.LOGIN, { replace: true });
                    })}>Hủy và quay lại đăng nhập</button>
                </div>
            </form>
        </> : <>
            <p>Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
            <Link className={link} to={ROUTE_PATHS.FORGOT_PASSWORD}>Yêu cầu liên kết mới</Link>
        </>}
    </AuthCard>;
}
