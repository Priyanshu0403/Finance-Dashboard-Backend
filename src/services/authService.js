import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import db from "../config/database.js";
import { JWT_SECRET } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

const TOKEN_TTL = "8h";

export class AuthService {
  login(email, password) {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      bcrypt.compareSync(password, "$2b$10$invalidhashpadding00000000000000");
      throw new AppError(401, "Invalid email or password.");
    }

    if (!user.is_active) {
      throw new AppError(403, "Account is deactivated.");
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      throw new AppError(401, "Invalid email or password.");
    }

    const payload = { userId: user.id, role: user.role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
  }
}

export const authService = new AuthService();
