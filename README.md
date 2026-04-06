# Finance Dashboard Backend

A role-based REST API backend for a multi-user finance dashboard. Built with **Node.js**, **JavaScript**, **Express**, and **SQLite** (via `better-sqlite3`).

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [Roles & Access Control](#roles--access-control)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install & Run

```bash
# 1. Install dependencies
npm install

# 3. Seed the database with sample users and transactions
npm run seed

# 4. Start the development server
npm run dev

# Server starts at http://localhost:3000
```

### Seed Credentials

| Role    | Email                  | Password       |
|---------|------------------------|----------------|
| Admin   | admin@example.com      | Admin1234!     |
| Analyst | analyst@example.com    | Analyst1234!   |
| Viewer  | viewer@example.com     | Viewer1234!    |

### Quick API Test (curl)

```bash
# Login and capture token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin1234!"}' \
  | sed 's/.*"token":"\([^"]*\)".*/\1/')

# View dashboard summary
curl http://localhost:3000/api/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"

# List transactions with filters
curl "http://localhost:3000/api/transactions?type=income&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Project Structure

```
src/
├── app.js                    # Express app setup (routes, middleware)
├── server.js                 # HTTP server entry point
├── types.js                  # Shared role constants
├── seed.js                   # Database seeder
│
├── config/
│   └── database.js           # SQLite connection + schema setup
│
├── middleware/
│   ├── auth.js               # JWT authentication middleware
│   ├── rbac.js               # Role-based access control guards
│   └── errorHandler.js       # Global error handler + AppError class
│
├── routes/
│   ├── auth.js               # POST /api/auth/login, GET /api/auth/me
│   ├── users.js              # User CRUD (admin-managed)
│   ├── transactions.js       # Financial record CRUD with filters
│   └── dashboard.js          # Aggregated analytics endpoints
│
├── services/
│   ├── authService.js        # Login logic, token generation
│   ├── userService.js        # User CRUD, profile management
│   ├── transactionService.js # Transaction CRUD, pagination, filters
│   └── dashboardService.js   # Aggregation queries
│
└── validators/
    └── schemas.js            # Zod validation schemas for all inputs

tests/
└── api.test.js               # Integration tests (supertest)

data/
└── finance.db                # SQLite database (auto-created)
```

---

## Architecture & Design Decisions

### Layered Architecture

```
HTTP Request
    ↓
Router          (routes/)       — maps HTTP verbs/paths to handlers
    ↓
Middleware      (middleware/)   — auth, RBAC, validation, error handling
    ↓
Service Layer   (services/)     — all business logic lives here
    ↓
Database        (config/)       — direct SQL via better-sqlite3
```

Keeping business logic in services (not routes) makes the code testable in isolation and keeps route handlers thin.

### Why SQLite + better-sqlite3?

- Zero external process to spin up — perfect for an assessment submission.
- `better-sqlite3` is **synchronous**, which eliminates callback/promise complexity for simple CRUD and makes the code easier to follow.
- WAL mode is enabled so concurrent reads don't block writes.
- The schema and indexes are defined once in `config/database.js` and applied automatically on startup, so no separate migration tool is needed at this scale.

### Soft Delete

Transactions are never physically removed. `DELETE /api/transactions/:id` sets `is_deleted = 1`. All queries filter on `is_deleted = 0`. This preserves audit history and makes accidental deletion recoverable.

### JWT Authentication

- Tokens are signed with a secret from `JWT_SECRET` env var (falls back to a dev default).
- TTL is 8 hours, matching a typical working day.
- The `authenticate` middleware is applied per-router so routes can opt in explicitly.

### Role Hierarchy

Roles are modelled as a rank rather than a flat permission list. This keeps the guard logic simple: a user with rank ≥ required rank passes. The three roles map to: `viewer=1`, `analyst=2`, `admin=3`.

---

## Roles & Access Control

| Endpoint                         | Viewer | Analyst | Admin |
|----------------------------------|--------|---------|-------|
| `POST /api/auth/login`           | ✅      | ✅       | ✅     |
| `GET  /api/auth/me`              | ✅      | ✅       | ✅     |
| `GET  /api/transactions`         | ✅      | ✅       | ✅     |
| `GET  /api/transactions/:id`     | ✅      | ✅       | ✅     |
| `GET  /api/dashboard/summary`    | ❌      | ✅       | ✅     |
| `GET  /api/dashboard/weekly`     | ❌      | ✅       | ✅     |
| `POST /api/transactions`         | ❌      | ❌       | ✅     |
| `PATCH /api/transactions/:id`    | ❌      | ❌       | ✅     |
| `DELETE /api/transactions/:id`   | ❌      | ❌       | ✅     |
| `GET  /api/users`                | ❌      | ❌       | ✅     |
| `POST /api/users`                | ❌      | ❌       | ✅     |
| `GET  /api/users/:id`            | self   | self    | ✅     |
| `PATCH /api/users/:id`           | ❌      | ❌       | ✅     |

---

## API Reference

All authenticated endpoints require:
```
Authorization: Bearer <token>
```

---

### Auth

#### `POST /api/auth/login`
```json
// Request
{ "email": "admin@example.com", "password": "Admin1234!" }

// Response 200
{ "token": "<jwt>" }
```

#### `GET /api/auth/me`
```json
// Response 200
{
  "id": 1,
  "name": "Alice Admin",
  "email": "admin@example.com",
  "role": "admin",
  "is_active": 1,
  "created_at": "2024-03-01T10:00:00",
  "updated_at": "2024-03-01T10:00:00"
}
```

---

### Users *(Admin only)*

#### `GET /api/users`
Returns an array of users without password hashes.

Optional filters:

| Param | Type | Description |
|---|---|---|
| `role` | string | `viewer`, `analyst`, or `admin` |
| `is_active` | boolean-like string | `true` or `false` |
| `q` | string | search by name or email |

#### `POST /api/users`
```json
// Request
{
  "name": "Bob Smith",
  "email": "bob@example.com",
  "password": "Secure123!",
  "role": "analyst"          // "viewer" | "analyst" | "admin"
}

// Response 201 — created user (no password_hash)
```

#### `GET /api/users/:id`
Any user can fetch their own profile. Admin can fetch any.

#### `PATCH /api/users/:id`
```json
// All fields optional
{
  "name": "Bob Updated",
  "email": "bob.updated@example.com",
  "role": "viewer",
  "is_active": false
}
```

---

### Transactions

#### `GET /api/transactions`

Query parameters (all optional):

| Param       | Type   | Description                     |
|-------------|--------|---------------------------------|
| `type`      | string | `income` or `expense`           |
| `category`  | string | exact category name             |
| `date_from` | string | YYYY-MM-DD                      |
| `date_to`   | string | YYYY-MM-DD                      |
| `q`         | string | partial match in category/notes |
| `page`      | number | default `1`                     |
| `limit`     | number | default `20`, max `100`         |

```json
// Response 200
{
  "data": [
    {
      "id": 1,
      "amount": 5000,
      "type": "income",
      "category": "Salary",
      "date": "2024-03-01",
      "notes": "March salary",
      "created_by": 1,
      "is_deleted": 0,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

#### `POST /api/transactions` *(Admin)*
```json
{
  "amount": 1200.50,
  "type": "expense",
  "category": "Rent",
  "date": "2024-03-05",
  "notes": "March rent"       // optional
}
```

#### `PATCH /api/transactions/:id` *(Admin)*
All fields optional. `notes` can be set to `null` to clear it.

#### `DELETE /api/transactions/:id` *(Admin)*
Soft delete. Returns `204 No Content`.

---

### Dashboard *(Analyst + Admin)*

#### `GET /api/dashboard/summary`

Optional query params: `date_from`, `date_to` (YYYY-MM-DD)

```json
// Response 200
{
  "total_income": 18500.00,
  "total_expense": 7430.50,
  "net_balance": 11069.50,
  "by_category": [
    { "category": "Salary", "total": 12000.00 },
    { "category": "Rent",   "total": 3600.00 }
  ],
  "monthly_trends": [
    { "month": "2024-03", "income": 6500.00, "expense": 2100.00 },
    { "month": "2024-02", "income": 6000.00, "expense": 2430.50 }
  ],
  "recent_transactions": [ /* last 10 */ ]
}
```

#### `GET /api/dashboard/weekly`

Optional query param: `weeks` (1–52, default `8`)

```json
// Response 200
[
  { "week": "2024-W10", "income": 3000.00, "expense": 850.00 },
  { "week": "2024-W09", "income": 0.00,    "expense": 1200.00 }
]
```

---

## Error Handling

All errors follow a consistent shape:

```json
{ "error": "Human-readable message." }

// Validation errors include details:
{
  "error": "Validation failed.",
  "details": ["amount: Number must be positive", "date: Date must be in YYYY-MM-DD format"]
}
```

| Status | Meaning                                           |
|--------|---------------------------------------------------|
| `400`  | Validation error or bad request                  |
| `401`  | Missing or invalid token                         |
| `403`  | Authenticated but insufficient permissions       |
| `404`  | Resource not found                               |
| `409`  | Conflict (e.g. duplicate email)                  |
| `500`  | Unexpected server error (details hidden)         |

---

## Testing

```bash
npm test
```

Tests use **Jest + Supertest** against an in-memory SQLite database (`NODE_ENV=test`), so they are fully isolated, fast, and leave no files on disk.

Coverage includes:
- Auth login (valid, wrong password, missing fields)
- `GET /auth/me` (with and without token)
- User creation, duplicate email, analyst blocked
- Transaction create, read, filter by type, soft-delete
- RBAC enforcement across all roles
- Dashboard summary access control

---

## Assumptions & Trade-offs

| Decision | Rationale |
|---|---|
| SQLite instead of Postgres | Zero setup for assessment; switching requires only changing the DB driver and query dialect |
| Synchronous `better-sqlite3` | Simpler code; at interview/demo scale throughput is irrelevant |
| JWT (stateless) over sessions | No session store needed; fits a stateless REST API pattern |
| Soft delete only | Preserves financial audit trail; hard deletes are dangerous in finance contexts |
| Flat role hierarchy (3 levels) | Keeps RBAC guard simple; a real system might need per-resource permissions |
| Passwords stored with bcrypt (10 rounds) | Balances security and seeding speed; production might use 12–14 rounds |
| No email verification flow | Out of scope for an internal dashboard tool |
| Rate limiting at 200 req/15 min global, 20 req/15 min for `/auth/login` | Reasonable defaults; login stricter to limit brute-force |
