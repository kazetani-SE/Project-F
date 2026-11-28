export type ClubRole = 'PRESIDENT' | 'VICEPRESIDENT' | 'MEMBER';
export interface AuthUser {
    id: string;
    fullName: string;
    email: string;
    clubRole: ClubRole;
    phone: string | null;
}
export interface UpdateProfileRequest {
    fullName: string;
    phone: string | null;
}
