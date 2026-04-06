# Finance Dashboard Backend

This is a backend project for a finance dashboard assignment.

It is built using Node.js, Express and SQLite.

## What This Project Does

- User login using JWT
- Three user roles: viewer, analyst and admin
- Admin can create and manage users
- Admin can create, update and delete transactions
- Users can view transactions
- Analyst and admin can view dashboard summary
- Input validation is added using Zod

## How To Run

Install dependencies:

```bash
npm install
```

Create `.env` file from `.env.example`:

```bash
copy .env.example .env
```

Add sample data:

```bash
npm run seed
```

Start the server:

```bash
npm start
```

The server will run on:

```text
http://localhost:3000
```

## Test Login Details

Admin:

```text
email: admin@example.com
password: Admin1234!
```

Analyst:

```text
email: analyst@example.com
password: Analyst1234!
```

Viewer:

```text
email: viewer@example.com
password: Viewer1234!
```

## Main Routes

Auth routes:

```text
POST /api/auth/login
GET /api/auth/me
```

User routes:

```text
GET /api/users
POST /api/users
GET /api/users/:id
PATCH /api/users/:id
```

Transaction routes:

```text
GET /api/transactions
POST /api/transactions
GET /api/transactions/:id
PATCH /api/transactions/:id
DELETE /api/transactions/:id
```

Dashboard routes:

```text
GET /api/dashboard/summary
GET /api/dashboard/weekly
```

## Database

I used SQLite for this project because it is simple and does not need a separate database setup.

The database file is created inside the `data` folder after running the project.

## Testing

To run tests:

```bash
npm test
```

## API Testing

The APIs can also be tested using Postman after starting the server.

Base URL:

```text
http://localhost:3000
```

First call the login API:

```text
POST /api/auth/login
```

Then use the returned token as a Bearer Token for protected routes.

## Note

This is not a production-ready project. It is made for an assignment to show backend structure, role based access, validation and basic finance dashboard APIs.
