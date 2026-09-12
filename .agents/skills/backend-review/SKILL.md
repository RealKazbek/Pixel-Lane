---
name: backend-review
description: Checklist for server/API/domain-logic changes (endpoints, services, business rules).
---

# Backend review

Run this for changes to APIs, services, or domain logic.

## Checklist

- Request/response validation at the boundary; no trusting client-side
  checks.
- Authorization enforced in the handler/service, not just in the UI.
- Domain logic separated from transport/controller code (see
  `architecture-review` for Pixel Lane boundaries).
- Errors return safe, non-leaking messages to clients; details logged
  server-side only, excluding sensitive data.
- Database access uses transactions where multiple writes must be atomic;
  no obvious N+1 query patterns introduced.
- New endpoints/services have appropriate tests (see `testing` skill).
- No god services — one service, one responsibility.
- Route handlers delegate to a service/repository layer rather than making
  direct database calls themselves.
- Run `security-review` if the change touches auth, input, or data access.
- Run `database-review` if the change touches schema, queries, or
  migrations.

## Output

Note any endpoint/service added or changed, its auth requirements, and
whether tests cover its main behavior and failure paths.
