# Team Task Tracker API

A production-minded, multi-tenant task management backend built with Node.js, TypeScript, and Express.

## 🚀 Overview

This API provides a secure and scalable foundation for team collaboration, featuring robust multi-tenant isolation, role-based access control (RBAC), and advanced security measures like refresh token rotation and reuse detection.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Security**: JWT, bcryptjs, Refresh Token Rotation
- **Documentation**: Swagger/OpenAPI 3.0
- **Validation**: Zod
- **Infrastructure**: Docker & Docker Compose

## ✨ Key Features

- **Multi-Tenant Isolation**: Deep organization-level data isolation ensures no cross-tenant data leakage.
- **Granular RBAC**: Three roles (`ADMIN`, `MANAGER`, `MEMBER`) with strictly enforced permissions.
- **Task Workflow Engine**: Controlled task status transitions (`TODO` -> `IN_PROGRESS` -> `IN_REVIEW` -> `DONE`).
- **Advanced Auth Security**:
    - **Refresh Token Rotation**: New refresh tokens issued on every refresh.
    - **Reuse Detection**: Proactive revocation of all user sessions upon detection of compromised token reuse.
- **Performance Optimized**: Redis caching for read-heavy task listing endpoints.
- **Interactive Documentation**: Swagger UI for live API testing and exploration.

## 🚦 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (v20+) and npm (optional, for local development)

### Quick Start (Docker)

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd team-task-tracker-api
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Update variables in .env if necessary
   ```

3. **Spin up the infrastructure**:
   ```bash
   docker compose up -d
   ```

4. **Access the API**:
   - API Base URL: `http://localhost:3000`
   - **Swagger Documentation**: `http://localhost:3000/api-docs`

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run migrations**:
   ```bash
   npx prisma migrate dev
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

## 🧪 Testing

The project includes an extensive suite of integration and security tests.

To run tests (ensure infrastructure is running):
```bash
# Workflow tests
npx ts-node tests/workflow.test.ts

# Security & Isolation tests
npx ts-node tests/security.test.ts

# Auth Rotation & Reuse Detection
npx ts-node tests/auth_rotation.test.ts

# Redis Caching
npx ts-node tests/cache.test.ts
```

## 🏛️ Architecture

The project follows a **Layered Architecture** pattern:
`Route -> Controller -> Service -> Repository`

- **Controllers**: Thin handlers for HTTP concerns.
- **Services**: The "Brain" of the application. Contains all business logic and workflow rules.
- **Repositories**: Data access abstraction using Prisma.
- **Middleware**: Centralized logic for Auth, RBAC, Validation, and Error Handling.

## 🛡️ Security Guardrails

- **Data Isolation**: Every Prisma query is scoped with `organizationId` derived from the user's JWT.
- **Validation**: Strict input validation using Zod schemas before hitting business logic.
- **Error Handling**: Centralized `AppError` pattern for consistent and safe error responses.

---
*Developed as a demonstration of high-quality backend engineering fundamentals.*
