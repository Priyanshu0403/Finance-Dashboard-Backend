import db from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";

export class TransactionService {
  create(data, createdBy) {
    const result = db
      .prepare(
        `INSERT INTO transactions (amount, type, category, date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.amount,
        data.type,
        data.category.trim(),
        data.date,
        data.notes ?? null,
        createdBy
      );

    return this.findByIdOrFail(Number(result.lastInsertRowid));
  }

  findAll(filters) {
    const conditions = ["is_deleted = 0"];
    const params = [];

    if (filters.type) {
      conditions.push("type = ?");
      params.push(filters.type);
    }
    if (filters.category) {
      conditions.push("category = ?");
      params.push(filters.category.trim());
    }
    if (filters.date_from) {
      conditions.push("date >= ?");
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push("date <= ?");
      params.push(filters.date_to);
    }
    if (filters.q) {
      conditions.push("(category LIKE ? OR COALESCE(notes, '') LIKE ?)");
      const pattern = `%${filters.q}%`;
      params.push(pattern, pattern);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const total = db
      .prepare(`SELECT COUNT(*) as count FROM transactions ${where}`)
      .get(...params).count;

    const offset = (filters.page - 1) * filters.limit;

    const data = db
      .prepare(
        `SELECT * FROM transactions ${where}
         ORDER BY date DESC, created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, filters.limit, offset);

    return {
      data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        total_pages: Math.ceil(total / filters.limit),
      },
    };
  }

  findByIdOrFail(id) {
    const tx = db
      .prepare("SELECT * FROM transactions WHERE id = ? AND is_deleted = 0")
      .get(id);

    if (!tx) {
      throw new AppError(404, "Transaction not found.");
    }

    return tx;
  }

  update(id, data) {
    this.findByIdOrFail(id);

    const fields = [];
    const values = [];

    if (data.amount !== undefined) {
      fields.push("amount = ?");
      values.push(data.amount);
    }
    if (data.type !== undefined) {
      fields.push("type = ?");
      values.push(data.type);
    }
    if (data.category !== undefined) {
      fields.push("category = ?");
      values.push(data.category.trim());
    }
    if (data.date !== undefined) {
      fields.push("date = ?");
      values.push(data.date);
    }
    if (Object.prototype.hasOwnProperty.call(data, "notes")) {
      fields.push("notes = ?");
      values.push(data.notes ?? null);
    }

    if (fields.length === 0) {
      throw new AppError(400, "No updatable fields provided.");
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    return this.findByIdOrFail(id);
  }

  softDelete(id) {
    this.findByIdOrFail(id);

    db.prepare(
      `UPDATE transactions
       SET is_deleted = 1, updated_at = datetime('now')
       WHERE id = ?`
    ).run(id);
  }
}

export const transactionService = new TransactionService();
