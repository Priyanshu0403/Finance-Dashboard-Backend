import { Router } from "express";

import { authenticate } from "../middleware/auth.js";
import { adminOnly, viewerOrAbove } from "../middleware/rbac.js";
import { createUserSchema, updateUserSchema, userFilterSchema } from "../validators/schemas.js";
import { userService } from "../services/userService.js";
import { Role } from "../types.js";

const router = Router();

router.use(authenticate);

router.get("/", adminOnly, (_req, res, next) => {
  try {
    const filters = userFilterSchema.parse(_req.query);
    res.json(userService.findAll(filters));
  } catch (err) {
    next(err);
  }
});

router.post("/", adminOnly, (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = userService.create(data);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", viewerOrAbove, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid user ID." });
      return;
    }

    if (req.user.role !== Role.ADMIN && req.user.userId !== id) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    res.json(userService.findByIdOrFail(id));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", adminOnly, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid user ID." });
      return;
    }

    const data = updateUserSchema.parse(req.body);
    const updated = userService.update(id, data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
