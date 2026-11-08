import type { EventStatus } from '../../types/models/event';

const transitions: Record<EventStatus, EventStatus[]> = {
    PLANNING: ['APPROVED', 'CANCELLED'],
    APPROVED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
};

export function statusOptions(status: EventStatus) {
    return transitions[status];
}
