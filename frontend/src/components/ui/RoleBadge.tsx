import type {EventRole} from "../../types/models/event.ts";
import {EVENT_ROLE_LABEL} from "../../constants/enum/role.ts";


export default function RoleBadge({ role }: { role: EventRole }) {
    const tone =
        role === 'HEAD_ORGANIZER' || role === 'VICE_ORGANIZER'
            ? 'bg-gold text-title'
            : role === 'MEMBER'
                ? 'bg-primary-surface text-primary'
                : 'bg-primary text-white';
    return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
      {EVENT_ROLE_LABEL[role]}
    </span>
    );
}