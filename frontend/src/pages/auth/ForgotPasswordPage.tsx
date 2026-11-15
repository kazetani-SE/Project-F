import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/route';
import { useAuth } from '../../context/authContext';
import { useMutation } from '../../hooks/useMutation';
import { button, ErrorNotice, field, link } from '../../components/ui/CrudUi';
import { AuthCard } from './AuthCard';

export function ForgotPasswordPage() {
    const { sendReset } = useAuth();
    const [sent, setSent] = useState(false);
    const { busy, error, mutate } = useMutation();
    return <AuthCard title="Quên mật khẩu">
        <ErrorNotice error={error} />
        {sent ? <p role="status">Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu.</p> :
            <form className="space-y-4" onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void mutate(async () => {
                    await sendReset(String(values.get('email')).trim());
                    setSent(true);
                });
            }}>
                <label className="block">Email<input className={field} name="email" type="email" autoComplete="email" required /></label>
                <button className={button} disabled={busy}>Gửi liên kết đặt lại</button>
            </form>}
        <Link className={link} to={ROUTE_PATHS.LOGIN}>Quay lại đăng nhập</Link>
    </AuthCard>;
}
