import type {AuthUser} from "../types/models/auth.ts";
import type {EventRole, EventSummary} from "../types/models/event.ts";


export const MOCK_USER: AuthUser = {
    id: 'u-0001',
    fullName: 'Nguyễn Văn An',
    email: 'an.nguyen@fcode.local',
    clubRole: 'PRESIDENT',
};

export const MOCK_EVENTS: EventSummary[] = [
    { id: 'ev-tech-fall-2026', name: 'Tech-Camp', seasonLabel: 'Season Fall 2026', status: 'IN_PROGRESS' },
    { id: 'ev-codewars-2026', name: 'Code Wars', seasonLabel: 'Season 2026', status: 'PLANNING' },
    { id: 'ev-git-101', name: 'Workshop Git & GitHub 101', seasonLabel: null, status: 'COMPLETED' },
    { id: 'ev-hackathon-2025', name: 'Hackathon', seasonLabel: 'Season 2025', status: 'CANCELLED' },
];

// Muốn test vai trò nào thì sửa ở đây. null = "Không thuộc BTC"
export const MOCK_ROLES: Record<string, EventRole | null> = {
    'ev-tech-fall-2026': 'HEAD_ORGANIZER',
    'ev-codewars-2026': 'LEAD_FINANCE',
    'ev-git-101': null,
    'ev-hackathon-2025': 'MEMBER',
};