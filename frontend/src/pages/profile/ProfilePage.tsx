import { useState, type FormEvent } from 'react';
import { ErrorNotice } from '../../components/ui/CrudUi';
import { useAuth } from '../../context/authContext';
import { useMutation } from '../../hooks/useMutation';
import type { AuthUser } from '../../types/models/auth';

const inputClass = 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-emerald-600';

export default function ProfilePage() {
    const { user } = useAuth();
    return user && <ProfileForm key={user.id} user={user} />;
}

function ProfileForm({ user }: { user: AuthUser }) {
    const { updateProfile } = useAuth();
    const [fullName, setFullName] = useState(user.fullName);
    const [phone, setPhone] = useState(user.phone ?? '');
    const [saved, setSaved] = useState(false);
    const { busy, error, mutate } = useMutation();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const phoneValid = trimmedPhone === '' || /^[0-9+\-\s]{8,15}$/.test(trimmedPhone);
    const changed = trimmedName !== user.fullName || trimmedPhone !== (user.phone ?? '');
    const canSubmit = !busy && changed && Boolean(trimmedName) && phoneValid;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;
        setSaved(false);
        void mutate(async () => {
            const profile = await updateProfile({ fullName: trimmedName, phone: trimmedPhone || null });
            setFullName(profile.fullName);
            setPhone(profile.phone ?? '');
            setSaved(true);
        });
    }

    return (
        <section className="mx-auto w-full max-w-2xl space-y-5">
            <h1 className="text-2xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
            <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <fieldset disabled={busy} className="space-y-5">
                    <label className="block text-sm font-medium text-slate-700">
                        Họ và tên
                        <input className={inputClass} required maxLength={100} autoComplete="name" value={fullName}
                            onChange={(event) => { setFullName(event.target.value); setSaved(false); }} />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Email đăng nhập
                        <input className={`${inputClass} bg-slate-50 text-slate-600`} type="email" value={user.email} readOnly />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Số điện thoại
                        <input className={inputClass} type="tel" maxLength={15} pattern="[0-9+\-\s]{8,15}"
                            title="Số điện thoại gồm 8–15 ký tự số, dấu +, - hoặc khoảng trắng" autoComplete="tel" value={phone}
                            onChange={(event) => { setPhone(event.target.value); setSaved(false); }} />
                    </label>
                    <ErrorNotice error={error} />
                    {saved && <p role="status" className="text-sm text-emerald-700">Đã lưu hồ sơ.</p>}
                    <button type="submit" disabled={!canSubmit}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                        {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </button>
                </fieldset>
            </form>
        </section>
    );
}
