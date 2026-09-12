---
name: security-review
description: Security review checklist for security-sensitive changes (auth, input handling, file access, secrets, external requests). Use before shipping any such change.
---

# Security review

Run this for any change touching input handling, auth, permissions, file
access, external requests/URLs, secrets, or data storage/logging.

## Checklist

- **Input validation**: all external input validated at the boundary
  (request bodies, query params, file contents, headers), never trusting
  frontend validation alone.
- **AuthN/AuthZ**: authentication required where expected; authorization and
  role/permission checks enforced server-side, not just hidden in the UI.
- **IDOR**: object access checks the requesting user actually owns/can
  access the resource, not just that a valid ID was supplied.
- **Injection**: SQL/NoSQL injection (parameterized queries only), command
  injection (no shelling out with unsanitized input), path traversal (no
  unsanitized paths reaching the filesystem).
- **SSRF**: no unsanitized user-supplied URLs used for server-side requests
  without an allowlist.
- **XSS/CSRF**: output encoding for any user content rendered in HTML; CSRF
  protection on state-changing endpoints.
- **Deserialization**: no unsafe deserialization of untrusted data.
- **File upload/access**: uploaded files validated (type/size), stored
  outside web root or served safely; no unrestricted file read/write paths.
- **Secrets**: no hardcoded secrets/API keys; `.env` with real values never
  committed (use `.env.example`); secrets not logged.
- **Logging**: no passwords, tokens, session cookies, or sensitive personal
  data in logs.
- **Error handling**: no stack traces or internal details leaked to clients.
- **Rate limiting**: present on auth/expensive endpoints where relevant.
- **CORS**: explicit allowlist, not `*` with credentials.
- **Redirects**: no open redirects using unvalidated user input.
- **Dependencies**: newly added dependencies checked for known
  vulnerabilities (audit tool for the ecosystem in use).
- **HTTP headers**: security headers set where the app serves HTTP
  responses (e.g. CSP, X-Content-Type-Options) as applicable.
- **Race conditions / transactions**: concurrent access to shared state or
  DB rows uses proper locking/transactions where correctness depends on it.

## Output

List findings as: issue, location, severity, and the fix applied (or why it
was not needed). If nothing applies, state that explicitly rather than
skipping the review.
