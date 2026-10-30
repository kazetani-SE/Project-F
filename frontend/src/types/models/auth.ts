export type ClubRole = 'PRESIDENT' | 'VICEPRESIDENT' | 'MEMBER';
export interface AuthUser {
    id: string;
    fullName: string;
    email: string;
    clubRole: ClubRole;
}