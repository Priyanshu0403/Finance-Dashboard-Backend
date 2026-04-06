import { ZodError } from "zod";

export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const messages = err.errors.map((entry) => `${entry.path.join(".")}: ${entry.message}`);
    res.status(400).json({ error: "Validation failed.", details: messages });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "An internal server error occurred." });
}
