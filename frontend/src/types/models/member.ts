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

export interface MemberImportRow {
    rowNumber: number;
    studentId: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    batch: string;
    status: 'CREATED' | 'AUTH_EXISTS' | 'EMAIL_FAILED' | 'AUTH_FAILED' | 'FAILED';
    reason: string;
    memberId: string | null;
}

export interface MemberImportReport {
    total: number;
    created: number;
    failed: number;
    existingAuth: number;
    emailFailed: number;
    rows: MemberImportRow[];
}
