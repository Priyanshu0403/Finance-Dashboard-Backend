const { Router } = require("express");

const { loginSchema } = require("../validators/schemas");
const { authService } = require("../services/authService");
const { authenticate } = require("../middleware/auth");
const { userService } = require("../services/userService");

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

module.exports = router;
