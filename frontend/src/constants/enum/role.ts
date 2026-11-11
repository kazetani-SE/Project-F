import type {EventRole} from "../../types/models/event.ts";
import type {ClubRole} from "../../types/models/auth.ts";

export const CLUB_ROLE_LABEL: Record<ClubRole, string> = {
    PRESIDENT: 'CHỦ NHIỆM CLB',
    VICEPRESIDENT: 'PHÓ CHỦ NHIỆM CLB',
    MEMBER: 'THÀNH VIÊN CLB',
};

export const EVENT_ROLE_LABEL: Record<EventRole, string> = {
    LEAD_HEADER: 'Trưởng BTC',
    HR: 'Ban Nhân sự',
    PLAN: 'Ban Kế hoạch',
    MEDIA: 'Ban Truyền thông',
    MEMBER: 'Thành viên BTC',
};
export const STORAGE_KEY_ACTIVE_EVENT = 'pf.activeEventId';
