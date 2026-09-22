# Database Schema — moved

This file used to describe four tables and is out of date (it still calls the password column `password`; it is
`password_hash`, and the database now has more than fifty tables).

**The current, complete reference is [16 — Database](16-database.md)**: every table, which module owns it, who
writes it, and how the schema is created and patched at boot.

Related:

- [database_handling_installation.md](database_handling_installation.md) — creating the database and loading a dump
- [21 — Live Server Deployment](21-live-server-deployment.md) — database setup on a server, backups
