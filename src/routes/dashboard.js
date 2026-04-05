const { Router } = require("express");
const { z } = require("zod");

const { authenticate } = require("../middleware/auth");
const { analystOrAbove } = require("../middleware/rbac");
const { dashboardService } = require("../services/dashboardService");

const router = Router();
router.use(authenticate, analystOrAbove);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .optional();

const summaryQuerySchema = z.object({
  date_from: isoDate,
  date_to: isoDate,
});

const weeklyQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(8),
});

router.get("/summary", (req, res, next) => {
  try {
    const { date_from, date_to } = summaryQuerySchema.parse(req.query);
    const summary = dashboardService.getSummary({ date_from, date_to });
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.get("/weekly", (req, res, next) => {
  try {
    const { weeks } = weeklyQuerySchema.parse(req.query);
    const trend = dashboardService.getWeeklyTrend(weeks);
    res.json(trend);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
