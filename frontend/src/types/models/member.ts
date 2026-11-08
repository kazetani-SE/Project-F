import type { ClubRole } from './auth';

export const departmentLabels = {
    HR: 'Nhân sự',
    PLAN: 'Kế hoạch',
    MEDIA: 'Truyền thông',
    ACADEMIC: 'Học thuật',
} as const;

export type Department = keyof typeof departmentLabels;

export interface MemberFields {
    fullName: string;
    email: string;
    phone: string | null;
    department: Department | null;
    clubRole: ClubRole;
    batch: string;
}

export interface CreateMemberRequest extends MemberFields {
    studentId: string;
}

export interface MemberResponse extends CreateMemberRequest {
    id: string;
    active: boolean;
    createdAt: string;
    inactiveAt: string | null;
}

export interface MemberQuery {
    page: number;
    size: number;
    sort?: string;
    keyword?: string;
    department?: Department;
    role?: ClubRole;
    batch?: string;
    isActive?: boolean;
}
