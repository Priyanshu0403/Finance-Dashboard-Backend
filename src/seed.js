const bcrypt = require("bcryptjs");

const db = require("./config/database");

const SALT_ROUNDS = 10;

function seed() {
  console.log("Seeding database...");

  const users = [
    { name: "Alice Admin", email: "admin@example.com", password: "Admin1234!", role: "admin" },
    { name: "Ana Analyst", email: "analyst@example.com", password: "Analyst1234!", role: "analyst" },
    { name: "Victor Viewer", email: "viewer@example.com", password: "Viewer1234!", role: "viewer" },
  ];

  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)`
  );

  for (const user of users) {
    const hash = bcrypt.hashSync(user.password, SALT_ROUNDS);
    insertUser.run(user.name, user.email, hash, user.role);
    console.log(`  ${user.role.padEnd(8)} -> ${user.email} (password: ${user.password})`);
  }

  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@example.com");

  const categories = {
    income: ["Salary", "Freelance", "Investment", "Bonus"],
    expense: ["Rent", "Utilities", "Groceries", "Transport", "Software", "Marketing"],
  };

  const insertTx = db.prepare(
    `INSERT INTO transactions (amount, type, category, date, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const today = new Date();
  const txCount = db.prepare("SELECT COUNT(*) as c FROM transactions").get();

  if (txCount.c === 0) {
    for (let m = 0; m < 6; m += 1) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - m);

      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i += 1) {
        const cat = categories.income[Math.floor(Math.random() * categories.income.length)];
        const amount = +(2000 + Math.random() * 8000).toFixed(2);
        const day = String(1 + Math.floor(Math.random() * 27)).padStart(2, "0");
        insertTx.run(
          amount,
          "income",
          cat,
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${day}`,
          `${cat} payment`,
          admin.id
        );
      }

      for (let i = 0; i < 4 + Math.floor(Math.random() * 3); i += 1) {
        const cat = categories.expense[Math.floor(Math.random() * categories.expense.length)];
        const amount = +(100 + Math.random() * 2000).toFixed(2);
        const day = String(1 + Math.floor(Math.random() * 27)).padStart(2, "0");
        insertTx.run(
          amount,
          "expense",
          cat,
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${day}`,
          `${cat} expense`,
          admin.id
        );
      }
    }
    console.log("  Sample transactions inserted.");
  } else {
    console.log("  Transactions already present, skipping.");
  }

  console.log("\nSeed complete.\n");
}

seed();
