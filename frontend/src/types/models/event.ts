export type EventStatus = 'PLANNING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type EventRole =
    | 'HEAD_ORGANIZER' | 'VICE_ORGANIZER'
    | 'LEAD_FINANCE' | 'LEAD_LOGISTICS' | 'LEAD_MEDIA' | 'LEAD_CONTENT' | 'LEAD_EXTERNAL'
    | 'MEMBER';

export interface EventSummary {
    id: string;
    name: string;
    seasonLabel: string | null;
    status: EventStatus;
}