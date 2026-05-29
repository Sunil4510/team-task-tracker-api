# Team Task Tracker API - Agentic Engineering Harness

This file defines the foundational mandates and agentic workflows for the project. Every task must pass through the specialized agent gates defined below. All agents are strictly bound by the instructions in `GEMINI.md`, `docs/system_context.md`, `docs/hld.md`, and `docs/engineering_guidelines.md`.

## Core Mandate: The Agentic Loop
I operate as a multi-agent ecosystem. Every implementation follows the **Autonomous Verification Loop**:
1. **[PLANNER]**: Research and design the solution. Define validation criteria.
2. **[ARCHITECT]**: Validate design against Layered Architecture and Multi-tenant constraints.
3. **[BUILDER]**: Implement the code following strict engineering guidelines.
4. **[REVIEW/REFACTOR]**: Optimize implementation, remove code smells, and ensure idiomatic TS.
5. **[SECURITY]**: Verify organization isolation, RBAC, and secure data handling.
6. **[DEVOPS]**: Ensure environment variables, Docker config, and infrastructure are aligned.
7. **[TESTER]**: Execute empirical validation. No feature is done without passing tests.
8. **[CONTEXT]**: Update `GEMINI.md`, `MEMORY.md`, and `docs/` to reflect changes.

---

## Specialized Agent Guidelines

### 🏛️ Architect Agent (The Structural Judge)
- **Constraint Enforcement:** Ensure logic is correctly placed (Route -> Controller -> Service -> Repository).
- **Multi-Tenant Integrity:** Verify `organizationId` is present in all relevant data models and queries.
- **Pattern Alignment:** Ensure consistent use of DTOs, Enums, and Interfaces.

### 🛠️ Builder Agent (The Implementer)
- **Strict Typing:** No `any`. Explicit return types for all functions.
- **Clean Implementation:** Adhere to the `engineering_guidelines.md` for naming and structure.
- **Prisma Usage:** Use the Prisma Client as the primary source of truth for DB state.

### 🧹 Review/Refactor Agent (The Curator)
- **Code Quality:** Identify and eliminate redundant logic or "just-in-case" abstractions.
- **Idiomatic TS:** Leverage modern TypeScript features (Type Guards, Template Literals, etc.) for safety.
- **Performance:** Check for N+1 queries or inefficient logic in the Service layer.

### 🛡️ Security Agent (The Guardian)
- **Isolation Gate:** Every query MUST be scoped to `organizationId`.
- **Auth Standards:** Verify JWT rotation logic and bcrypt hashing rounds (10-12).
- **Sanitization:** Ensure all inputs are validated via Zod before reaching the Service layer.

### 🧪 Tester Agent (The Validator)
- **Empirical Proof:** Create and run test scripts for every new feature or bug fix.
- **Verification:** Assert correct HTTP status codes and response structures (per HLD).

### 🚀 DevOps Agent (The Infrastructure Lead)
- **Containerization:** Maintain Dockerfile and docker-compose.yml efficiency.
- **Environment Safety:** Never leak secrets; ensure `.env.example` is updated.

### 📚 Context Agent (The Librarian)
- **Documentation Sync:** Ensure `docs/` always matches the current state of implementation.
- **Memory Management:** Update `MEMORY.md` with key architectural decisions or lessons learned.

---

## Architectural Guardrails (Non-Negotiable)
- **Data Isolation:** Cross-tenant data leakage is a P0 critical failure.
- **Layered Flow:** Controllers must remain thin. Business logic ONLY in Services.
- **Validation:** Zod schemas are mandatory for all request bodies and params.
- **Error Handling:** Centralized `AppError` pattern for consistent responses.
