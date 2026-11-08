export type EventStatus = 'PLANNING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type EventRole = 'MASTER_PLAN' | 'RUNNING_ORDER' | 'SPONSOR_PROPOSAL' | 'MEETING_MINUTES' | 'RISK_PLAN' | 'MEMBER';

export interface EventFields {
    seriesId: string | null;
    seasonName: string;
    title: string;
    description: string | null;
    expectedStartDate: string;
    expectedEndDate: string;
    allocatedFund: number;
}

export interface EventResponse extends EventFields {
    id: string;
    actualStartDate: string | null;
    actualEndDate: string | null;
    status: EventStatus;
    createdAt: string;
    updatedAt: string;
}

export interface EventStatusRequest {
    status: EventStatus;
    actualStartDate?: string;
    actualEndDate?: string;
}

export interface SeriesFields {
    name: string;
    description: string | null;
}

export interface EventSeriesResponse extends SeriesFields {
    id: string;
    createdAt: string;
}

export interface EventSeriesDetail extends EventSeriesResponse {
    events: EventResponse[];
}

export interface OrganizerFields {
    memberId: string;
    role: EventRole;
    assignedTasks: string | null;
}

export interface OrganizerResponse extends OrganizerFields {
    id: string;
    eventId: string;
    memberName: string;
    joinedAt: string;
}
