const { Router } = require("express");

const { authenticate } = require("../middleware/auth");
const { adminOnly, viewerOrAbove } = require("../middleware/rbac");
const {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema,
} = require("../validators/schemas");
const { transactionService } = require("../services/transactionService");

const router = Router();
router.use(authenticate);

router.get("/", viewerOrAbove, (req, res, next) => {
  try {
    const filters = transactionFilterSchema.parse(req.query);
    const result = transactionService.findAll(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/", adminOnly, (req, res, next) => {
  try {
    const data = createTransactionSchema.parse(req.body);
    const tx = transactionService.create(data, req.user.userId);
    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", viewerOrAbove, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid transaction ID." });
      return;
    }
    res.json(transactionService.findByIdOrFail(id));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", adminOnly, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid transaction ID." });
      return;
    }
    const data = updateTransactionSchema.parse(req.body);
    const updated = transactionService.update(id, data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", adminOnly, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid transaction ID." });
      return;
    }
    transactionService.softDelete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
