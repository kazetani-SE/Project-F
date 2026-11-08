import type { EventRole } from '../../types/models/event';
import type { ClubRole } from '../../types/models/auth';

export const CLUB_ROLE_LABEL: Record<ClubRole, string> = {
    PRESIDENT: 'CHỦ NHIỆM CLB',
    VICEPRESIDENT: 'PHÓ CHỦ NHIỆM CLB',
    MEMBER: 'THÀNH VIÊN CLB',
};

export const EVENT_ROLE_LABEL: Record<EventRole, string> = {
    MASTER_PLAN: 'Kế hoạch tổng thể',
    RUNNING_ORDER: 'Kịch bản chương trình',
    SPONSOR_PROPOSAL: 'Hồ sơ tài trợ',
    MEETING_MINUTES: 'Biên bản họp',
    RISK_PLAN: 'Kế hoạch rủi ro',
    MEMBER: 'Thành viên BTC',
};

export const STORAGE_KEY_ACTIVE_EVENT = 'pf.activeEventId';
