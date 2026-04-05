const bcrypt = require("bcryptjs");

const db = require("../config/database");
const { AppError } = require("../middleware/errorHandler");

const SALT_ROUNDS = 10;

function toSafeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

class UserService {
  create(data) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(data.email);

    if (existing) {
      throw new AppError(409, "A user with this email already exists.");
    }

    const password_hash = bcrypt.hashSync(data.password, SALT_ROUNDS);

    const result = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES (?, ?, ?, ?)`
      )
      .run(data.name, data.email, password_hash, data.role);

    return this.findByIdOrFail(Number(result.lastInsertRowid));
  }

  findAll(filters = {}) {
    const conditions = ["1 = 1"];
    const params = [];

    if (filters.role) {
      conditions.push("role = ?");
      params.push(filters.role);
    }

    if (filters.is_active !== undefined) {
      conditions.push("is_active = ?");
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.q) {
      conditions.push("(name LIKE ? OR email LIKE ?)");
      const pattern = `%${filters.q}%`;
      params.push(pattern, pattern);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const users = db.prepare(`SELECT * FROM users ${where} ORDER BY created_at DESC`).all(...params);
    return users.map(toSafeUser);
  }

  findByIdOrFail(id) {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

    if (!user) {
      throw new AppError(404, "User not found.");
    }

    return toSafeUser(user);
  }

  update(id, data) {
    const existingUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

    if (!existingUser) {
      throw new AppError(404, "User not found.");
    }

    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.role !== undefined) {
      fields.push("role = ?");
      values.push(data.role);
    }
    if (data.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(data.is_active ? 1 : 0);
    }

    if (data.email !== undefined) {
      const duplicate = db
        .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .get(data.email, id);

      if (duplicate) {
        throw new AppError(409, "A user with this email already exists.");
      }

      fields.push("email = ?");
      values.push(data.email);
    }

    if (fields.length === 0) {
      throw new AppError(400, "No updatable fields provided.");
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    return this.findByIdOrFail(id);
  }

  getProfile(userId) {
    return this.findByIdOrFail(userId);
  }
}

module.exports = {
  UserService,
  userService: new UserService(),
};
