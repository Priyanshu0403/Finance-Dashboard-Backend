import db from "../config/database.js";

export class DashboardService {
  getSummary(opts = {}) {
    const dateConditions = ["is_deleted = 0"];
    const dateParams = [];

    if (opts.date_from) {
      dateConditions.push("date >= ?");
      dateParams.push(opts.date_from);
    }
    if (opts.date_to) {
      dateConditions.push("date <= ?");
      dateParams.push(opts.date_to);
    }

    const where = `WHERE ${dateConditions.join(" AND ")}`;

    const totalsRow = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
         FROM transactions
         ${where}`
      )
      .get(...dateParams);

    const by_category = db
      .prepare(
        `SELECT category, ROUND(SUM(amount), 2) AS total
         FROM transactions
         ${where}
         GROUP BY category
         ORDER BY total DESC`
      )
      .all(...dateParams);

    const monthly_trends = db
      .prepare(
        `SELECT
           strftime('%Y-%m', date) AS month,
           ROUND(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 2) AS income,
           ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2) AS expense
         FROM transactions
         ${where}
         GROUP BY month
         ORDER BY month DESC
         LIMIT 12`
      )
      .all(...dateParams);

    const recent_transactions = db
      .prepare(
        `SELECT * FROM transactions
         ${where}
         ORDER BY date DESC, created_at DESC
         LIMIT 10`
      )
      .all(...dateParams);

    return {
      total_income: totalsRow.total_income,
      total_expense: totalsRow.total_expense,
      net_balance: +(totalsRow.total_income - totalsRow.total_expense).toFixed(2),
      by_category,
      monthly_trends,
      recent_transactions,
    };
  }

  getWeeklyTrend(weeks = 8) {
    return db
      .prepare(
        `SELECT
           strftime('%Y-W%W', date) AS week,
           ROUND(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 2) AS income,
           ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2) AS expense
         FROM transactions
         WHERE is_deleted = 0
           AND date >= date('now', ? || ' days')
         GROUP BY week
         ORDER BY week DESC`
      )
      .all(`-${weeks * 7}`);
  }
}

export const dashboardService = new DashboardService();
