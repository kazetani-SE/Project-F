import type { ClubRole } from './auth';

export type Department = 'HR' | 'PLAN' | 'MEDIA' | 'ACADEMIC';

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
