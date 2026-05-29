# Engineering Guidelines

# Stack

* Node.js
* TypeScript
* Express
* PostgreSQL
* Prisma
* Redis
* JWT
* Zod

---

# Architecture

Use layered architecture:

route
-> controller
-> service
-> repository

Additional layers:

* middleware
* validators
* cache
* errors
* utils

---

# Folder Structure

src/
├── config/
├── controllers/
├── services/
├── repositories/
├── middleware/
├── routes/
├── validators/
├── cache/
├── errors/
├── utils/
├── prisma/
└── app.ts

---

# Rules

## Controllers

* Keep controllers thin
* No business logic
* No Prisma queries
* No RBAC logic

---

## Services

* Business logic belongs here
* Status transition logic belongs here
* Authorization checks allowed here if business-specific

---

## Repositories

* DB access only
* Prisma queries only
* No HTTP concerns

---

## Validation

* Use Zod
* Validate all request inputs
* Validation schemas inside validators/

---

## Error Handling

* Use centralized error middleware
* Use AppError abstraction
* Consistent error format

---

## RBAC

* RBAC enforced via middleware
* Never implement RBAC directly inside controllers

---

## Database

* Always enforce organization filtering
* Add indexes intentionally
* Use transactions where required

---

## Caching

* Cache only task list endpoints
* Prefer simple invalidation
* Prioritize correctness

---

## General Coding Standards

* Use async/await
* Use TypeScript strict mode
* Prefer readability over abstraction complexity
* Avoid overengineering
* Use meaningful naming
