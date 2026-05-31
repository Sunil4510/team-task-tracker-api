# Team Task Tracker API

A production-minded, multi-tenant task management backend built with Node.js, TypeScript, and Express. Developed as an SDE II Take-Home Assignment.

## 🚀 Overview

This API provides a secure and scalable foundation for team collaboration, featuring robust multi-tenant isolation, role-based access control (RBAC), and advanced security measures like refresh token rotation and reuse detection.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js (v5)
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Security**: JWT, bcryptjs, Refresh Token Rotation & Reuse Detection
- **Documentation**: Swagger/OpenAPI 3.0
- **Validation**: Zod
- **Infrastructure**: Docker & Docker Compose

## ✨ Key Features

- **Multi-Tenant Isolation**: Deep organization-level data isolation ensures no cross-tenant data leakage.
- **Granular RBAC**: Three roles (`ADMIN`, `MANAGER`, `MEMBER`) with strictly enforced middleware-level permissions.
- **Task Workflow Engine**: Controlled task status transitions (`TODO` -> `IN_PROGRESS` -> `IN_REVIEW` -> `DONE` and `BLOCKED`).
- **Advanced Auth Security**:
    - **Refresh Token Rotation**: New refresh tokens issued on every refresh.
    - **Reuse Detection**: Proactive "Burn Strategy" revokes all user sessions upon detection of compromised token reuse.
- **Performance Optimized**: Redis caching for read-heavy task listing endpoints.
- **Bonus - Analytics**: Advanced SQL aggregation endpoint for overdue tasks and average completion times.
- **Interactive Documentation**: Swagger UI for live API testing and exploration.

## 🚦 Getting Started

### Prerequisites

- Docker and Docker Compose

### Quick Start (Docker)

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd team-task-tracker-api
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # The default values in .env.example are pre-configured for Docker Compose
   ```

3. **Spin up the infrastructure**:
   ```bash
   docker compose up -d --build
   ```

4. **Access the API**:
   - API Base URL: `http://localhost:3000`
   - **Swagger Documentation**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## 🧪 Testing

The project includes an extensive suite of integration and security tests covering all critical flows.

To run tests (ensure docker containers are running):
```bash
npm test
```
*This command executes the following suites:*
- **Workflow Tests**: Verifies all 19 legal/illegal status transitions.
- **Security Tests**: Confirms multi-tenant isolation and RBAC boundaries.
- **Auth Rotation**: Verifies token rotation and reuse detection.
- **Redis Caching**: Confirms hit/miss and invalidation logic.

## 🏛️ Architecture & Design Decisions

### Layered Architecture
`Route -> Controller -> Service -> Repository (Prisma)`
- **Controllers**: Thin wrappers handling HTTP input/output.
- **Services**: Contain 100% of the business logic, workflow rules, and security isolation logic.
- **Middleware**: Decoupled logic for Auth, RBAC, and Zod validation.

### 💾 Database Design Decision: Composite Indexing
For the `tasks` table, I implemented **Composite Indexes** (e.g., `[organizationId, assigneeId]` and `[organizationId, status]`). 
- **Reasoning**: In a multi-tenant system, nearly 100% of queries filter by `organizationId`. A single index on `assigneeId` would be less efficient than a composite index that first narrows the search space to the specific organization. This ensures O(log n) lookup speeds even as the database grows to millions of tasks across thousands of tenants.

### ⚡ Caching Strategy: Pattern-Based Invalidation
- **Strategy**: We cache the results of the `listTasks` endpoint per organization and per unique query filter (hashed).
- **Invalidation**: We use a **Proactive Invalidation** approach. Whenever a task is created, updated, or deleted within an organization, we use `redisCache.deletePattern("tasks:ORG_ID:*")`.
- **Reasoning**: This ensures that users always see consistent data after a modification while benefiting from 2ms response times (10x faster) for subsequent reads.

## 🔮 Future Improvements

Given more time, the following enhancements would be prioritized:
1. **Real-time Notifications**: Implement WebSockets or SSE to notify assignees when a task status is changed by a Manager.
2. **ElasticSearch Integration**: Move complex full-text search and advanced filtering from PostgreSQL to a dedicated search engine.
3. **CI/CD Pipeline**: Integrate GitHub Actions for automated linting, building, and running the integration test suite on every PR.
4. **Audit Logging**: Implement a dedicated audit table to track every status transition and administrative change for compliance.

---
*Developed as a demonstration of high-quality backend engineering fundamentals.*
