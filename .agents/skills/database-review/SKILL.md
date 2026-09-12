---
name: database-review
description: Checklist for schema, query, and migration changes.
---

# Database review

Run this for schema changes, new queries, or migrations.

## Checklist

- Migrations are reversible or clearly documented if not.
- New columns/tables have appropriate constraints (NOT NULL, foreign keys,
  unique) rather than relying on application code alone.
- Queries use parameterization — never string-concatenated SQL.
- Multi-step writes that must be atomic are wrapped in a transaction.
- Indexes added for new query patterns on large/growing tables.
- No sensitive data (secrets, plaintext passwords) stored unencrypted.
- Access to rows is scoped to the requesting user/tenant where applicable
  (avoid IDOR via database queries).
- Consider race conditions on concurrent writes to the same row/aggregate.
- Uses PostgreSQL (the project's authoritative database) rather than a
  substitute like SQLite, unless the exception conditions in AGENTS.md § 5
  are met and documented.
- Relational data is modeled relationally; `JSONB` is used only for
  genuinely flexible/document-like data, not to skip schema design.

## Output

Note any migration's reversibility, constraints added, and any query
missing an index or transaction it likely needs.
