# Event RBAC and JWT configuration

Event authorization reads current assignments from PostgreSQL (including RDS). JWT verification does not call Supabase Auth.

## Configure the token verifier

Set `JWT_ISSUER`, `JWT_JWKS_URI`, and `JWT_AUDIENCE` in the backend environment. The issuer must publish an RSA/EC public JWKS; RS256 and ES256 are accepted. Tokens require a valid signature, issuer, audience, expiry, and UUID `sub`. Link that subject to `club_members.auth_user_id` before using protected endpoints. RDS does not issue tokens. Token issuance/login is outside this change.

## Declare event roles at a controller method

```java
@RequireEventRoles(eventId = "#eventId", value = {EventRole.LEAD_HEADER, EventRole.PLAN})
public ApiResponse<?> update(@PathVariable UUID eventId) { ... }
```

`eventId` is a server-authored SpEL expression evaluated against method arguments; it must resolve to a UUID. Use `#p0` if parameter names are unavailable. The annotation applies to public methods invoked through a Spring proxy, not self-invocation. Do not combine it with an unrelated club-admin guard that would block legitimate event roles.

The current active member must have one matching role in `event_organizers` for this event. Empty lists deny access. Role claims in JWT, department, and club roles grant no bypass. `EventRole.MEMBER` is valid when listed explicitly. Assignments are read on every invocation, so changing or removing a role applies to the next request.

The event update and status endpoints require `LEAD_HEADER`. Club member administration, event creation and organizer assignment keep their existing club administration rules. The existing broad guards on finance/document/media routes remain; this annotation is not a replacement for their resource-level authorization.

Missing/invalid JWT returns 401; an authenticated caller without an active matching assignment receives 403. For child-resource endpoints, resolve the owning event from the database and check it against the URL before reading or writing. Never authorize a record using only a client-supplied event ID.

## Compatibility

Frontend login, account provisioning/email verification, Supabase migrations and `/auth/me` account claiming retain their existing integration. Keep their `SUPABASE_*` settings when using those legacy flows. This is a JWT verifier and event RBAC change, not a full Supabase-to-RDS migration; the frontend still needs an issuer integration before end-to-end login can work without Supabase.
