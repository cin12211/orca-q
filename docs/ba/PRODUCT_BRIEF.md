# OrcaQ Product Brief

**Document Type:** Business Analysis - Product Brief  
**Product:** OrcaQ  
**Last Updated:** 2026-04-23

---

## Related Documents

- [Overview](./OVERVIEW.md)
- [Requirements](./REQUIREMENTS.md)
- [User Flows](./USER_FLOWS.md)
- [Module Detail Index](./README.md#module-detail-documents)

## 1. Product Overview

OrcaQ is a modern database editor and database client for managing, querying, and exploring databases through a friendly interface. It supports multiple database engines and multiple runtime platforms, allowing users to work with database projects from the web, desktop, Docker, or a terminal-driven npx flow.

OrcaQ is not only for backend engineers. The product should support users with different technical levels, including people who need to inspect data, run approved queries, verify environments, or understand database structures without deep database administration knowledge.

## 2. Product Vision

Make database work easier, safer, and more understandable by organizing database access around workspaces, project environments, and clear visual context.

## 3. Product Positioning

| Area                 | Position                                                              |
| -------------------- | --------------------------------------------------------------------- |
| Product category     | Database editor, database client, and database workspace tool         |
| Primary value        | Friendly multi-database access with project-based organization        |
| Differentiator       | Workspace-first model with environment-tagged connections             |
| User experience goal | Clear enough for non-specialists, powerful enough for technical users |
| Delivery model       | Web, terminal/npx, Docker, and desktop app                            |

## 4. Target Users

| User Group                | Needs                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Backend engineers         | Manage project database connections, run SQL, inspect schemas, and update data safely |
| Full-stack developers     | Quickly switch between app project environments and validate data behavior            |
| Data analysts             | Query and inspect data without setting up heavy database administration tools         |
| QA engineers              | Compare dev, test, uat, and prod-like environments while validating issues            |
| Product and support teams | Look up data with a controlled and understandable interface                           |
| Non-technical users       | Navigate approved database views and understand which environment they are using      |
| DBAs and DevOps engineers | Review connections, schemas, permissions, and operational context                     |

## 5. Supported Database Scope

| Database   | Business Purpose                                                                   |
| ---------- | ---------------------------------------------------------------------------------- |
| PostgreSQL | Main advanced database workflow and broadest administration support                |
| MySQL      | Common product and web application database access                                 |
| MariaDB    | MySQL-family database access for teams using MariaDB                               |
| Oracle     | Enterprise database access for business systems                                    |
| SQLite     | Local desktop database files, especially for development and lightweight use cases |

## 6. Supported Platform Scope

| Platform          | User Need                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Web app           | Access OrcaQ through a browser in a hosted or local environment                             |
| npx terminal flow | Start OrcaQ quickly without cloning the project                                             |
| Docker            | Run OrcaQ as a self-hosted containerized service                                            |
| Desktop app       | Use a native app experience, including desktop-only workflows such as SQLite file selection |

## 7. Core Product Model

### Workspace

A workspace represents a project, product, customer, team, or business context. Users use workspaces to separate different areas of database work.

Examples:

- `Customer Portal`
- `Internal Admin`
- `Finance Reporting`
- `QA Sandbox`

### Connection

A connection belongs to one workspace and represents access to one database target. In business terms, a connection usually maps to one environment inside a project.

Examples:

- `Customer Portal - dev`
- `Customer Portal - test`
- `Customer Portal - uat`
- `Customer Portal - prod`

### Environment Tag

An environment tag marks the role and risk level of a connection. Tags help users understand where they are working before running queries or changing data.

Default system tags:

| Tag     | Meaning                             | Risk Level |
| ------- | ----------------------------------- | ---------- |
| `local` | Local development database          | Low        |
| `dev`   | Development environment             | Low        |
| `test`  | Test environment                    | Medium     |
| `uat`   | User acceptance testing environment | Medium     |
| `prod`  | Production environment              | High       |

## 8. Product Modules

| Module                                                         | Business Description                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Workspace Management](./modules/WORKSPACE.md)                 | Create and manage project-level containers for database work                      |
| [Connection Management](./modules/CONNECTION.md)               | Create, test, edit, and organize database connections inside a workspace          |
| [Environment Tags](./modules/ENV_TAGS.md)                      | Assign environment labels such as dev, test, uat, and prod to connections         |
| Schema Explorer                                                | Browse database objects such as schemas, tables, views, and functions             |
| [Quick Query](./modules/QUICK_QUERY.md)                        | Inspect and edit table data through a visual grid                                 |
| [Raw Query](./modules/RAW_QUERY.md)                            | Write and execute SQL directly with result tabs                                   |
| [ERD Diagram](./modules/ERD.md)                                | Understand database relationships visually                                        |
| [Role and Permission Management](./modules/ROLE_PERMISSION.md) | Review or manage database users and access where supported                        |
| Export                                                         | Export database data or structures where supported                                |
| [Settings](./modules/GLOBAL_SETTINGS.md)                       | Configure editor behavior, query preferences, appearance, and AI provider options |
| Command Palette                                                | Find and run app actions quickly                                                  |
| [Agent Assistance](./modules/AGENT.md)                         | Support AI-assisted database workflows where configured                           |

## 9. Business Value

- Reduces confusion when switching between project database environments.
- Makes production access more visible through environment tags and strict-mode warnings.
- Gives non-backend users a more approachable path to inspect database information.
- Supports multiple deployment paths for different team workflows.
- Centralizes database project context into workspaces instead of disconnected connection lists.

## 10. Out of Scope for This BA Pack

- Detailed technical architecture.
- API endpoint contract documentation.
- Database-driver implementation details.
- Test strategy and engineering release plan.
- Enterprise access-control policy design beyond high-level role and permission needs.
