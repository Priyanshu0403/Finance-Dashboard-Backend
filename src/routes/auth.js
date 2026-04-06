import { Router } from "express";

import { loginSchema } from "../validators/schemas.js";
import { authService } from "../services/authService.js";
import { authenticate } from "../middleware/auth.js";
import { userService } from "../services/userService.js";

const router = Router();

router.post("/login", (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const token = authService.login(email, password);
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticate, (req, res, next) => {
  try {
    const profile = userService.getProfile(req.user.userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
