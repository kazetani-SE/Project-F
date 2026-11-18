package com.projectf.features.event.entity;
public enum EventStatus {
    PLANNING, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED;

    public boolean canTransitionTo(EventStatus next) {
        return switch (this) {
            case PLANNING -> next == APPROVED || next == CANCELLED;
            case APPROVED -> next == IN_PROGRESS || next == CANCELLED;
            case IN_PROGRESS -> next == COMPLETED || next == CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }
}
