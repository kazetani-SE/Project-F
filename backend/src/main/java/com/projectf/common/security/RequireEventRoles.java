package com.projectf.common.security;

import com.projectf.features.event.entity.EventRole;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Requires a current assignment with any listed role in the resolved event. */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireEventRoles {
    String eventId();
    EventRole[] value();
}
