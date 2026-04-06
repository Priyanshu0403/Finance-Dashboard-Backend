import request from "supertest";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import db from "../src/config/database.js";

function createUser(name, email, password, role) {
  const hash = bcrypt.hashSync(password, 10);
  return db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(name, email, hash, role);
}

async function getToken(email, password) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.token;
}

beforeAll(() => {
  createUser("Admin User", "admin@test.com", "Admin1234!", "admin");
  createUser("Analyst User", "analyst@test.com", "Analyst1!", "analyst");
  createUser("Viewer User", "viewer@test.com", "Viewer1234!", "viewer");
});

afterAll(() => {
  db.close();
});

describe("POST /api/auth/login", () => {
  it("returns a token on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "Admin1234!" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("returns 401 on wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 400 on missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "x" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns current user profile", async () => {
    const token = await getToken("analyst@test.com", "Analyst1!");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("analyst@test.com");
    expect(res.body).not.toHaveProperty("password_hash");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/users", () => {
  it("allows admin to list users", async () => {
    const token = await getToken("admin@test.com", "Admin1234!");
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("denies viewer from listing users", async () => {
    const token = await getToken("viewer@test.com", "Viewer1234!");
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/users", () => {
  it("admin can create a new user", async () => {
    const token = await getToken("admin@test.com", "Admin1234!");
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New User", email: "new@test.com", password: "NewPass123!", role: "viewer" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("new@test.com");
    expect(res.body).not.toHaveProperty("password_hash");
  });

  it("returns 409 on duplicate email", async () => {
    const token = await getToken("admin@test.com", "Admin1234!");
    await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dup", email: "dup@test.com", password: "DupPass123!", role: "viewer" });

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dup", email: "dup@test.com", password: "DupPass123!", role: "viewer" });
    expect(res.status).toBe(409);
  });

  it("analyst cannot create users", async () => {
    const token = await getToken("analyst@test.com", "Analyst1!");
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "X", email: "x@test.com", password: "XPass1234!", role: "viewer" });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/transactions", () => {
  it("admin can create a transaction", async () => {
    const token = await getToken("admin@test.com", "Admin1234!");
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1500, type: "income", category: "Salary", date: "2024-03-01" });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(1500);
    expect(res.body.type).toBe("income");
  });

  it("viewer cannot create a transaction", async () => {
    const token = await getToken("viewer@test.com", "Viewer1234!");
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 500, type: "expense", category: "Rent", date: "2024-03-05" });
    expect(res.status).toBe(403);
  });

  it("rejects negative amount", async () => {
    const token = await getToken("admin@test.com", "Admin1234!");
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: -100, type: "income", category: "Test", date: "2024-03-01" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid date format", async () => {
    const token = await getToken("admin@test.com", "Admin1234!");
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 100, type: "income", category: "Test", date: "01-03-2024" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/transactions", () => {
  it("viewer can list transactions", async () => {
    const token = await getToken("viewer@test.com", "Viewer1234!");
    const res = await request(app)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
  });

  it("supports filtering by type", async () => {
    const token = await getToken("viewer@test.com", "Viewer1234!");
    const res = await request(app)
      .get("/api/transactions?type=income")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((tx) => {
      expect(tx.type).toBe("income");
    });
  });
});

describe("DELETE /api/transactions/:id", () => {
  it("admin can soft-delete a transaction", async () => {
    const token = await getToken("admin@test.com", "Admin1234!");

    const create = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 50, type: "expense", category: "Test Delete", date: "2024-02-01" });
    const id = create.body.id;

    const del = await request(app)
      .delete(`/api/transactions/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get(`/api/transactions/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(get.status).toBe(404);
  });

  it("viewer cannot delete a transaction", async () => {
    const adminToken = await getToken("admin@test.com", "Admin1234!");
    const viewerToken = await getToken("viewer@test.com", "Viewer1234!");

    const create = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: 25, type: "expense", category: "CannotDelete", date: "2024-02-10" });

    const res = await request(app)
      .delete(`/api/transactions/${create.body.id}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/dashboard/summary", () => {
  it("analyst can access summary", async () => {
    const token = await getToken("analyst@test.com", "Analyst1!");
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total_income");
    expect(res.body).toHaveProperty("net_balance");
    expect(Array.isArray(res.body.by_category)).toBe(true);
  });

  it("viewer cannot access dashboard", async () => {
    const token = await getToken("viewer@test.com", "Viewer1234!");
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
