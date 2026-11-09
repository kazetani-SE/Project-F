import type {EventRole} from "../../types/models/event.ts";
import type {ClubRole} from "../../types/models/auth.ts";

export const CLUB_ROLE_LABEL: Record<ClubRole, string> = {
    PRESIDENT: 'CHỦ NHIỆM CLB',
    VICEPRESIDENT: 'PHÓ CHỦ NHIỆM CLB',
    MEMBER: 'THÀNH VIÊN CLB',
};

export const EVENT_ROLE_LABEL: Record<EventRole, string> = {
    HEAD_ORGANIZER: 'Trưởng BTC',
    VICE_ORGANIZER: 'Phó BTC',
    LEAD_FINANCE: 'Trưởng ban Tài chính',
    LEAD_LOGISTICS: 'Trưởng ban Hậu cần',
    LEAD_MEDIA: 'Trưởng ban Truyền thông',
    LEAD_CONTENT: 'Trưởng ban Nội dung',
    LEAD_EXTERNAL: 'Trưởng ban Đối ngoại',
    MEMBER: 'Thành viên BTC',
};
export const STORAGE_KEY_ACTIVE_EVENT = 'pf.activeEventId';