import type { Request, Response } from "express";
import { z } from "zod";
import logger from "./logger";

/**
 * Обрабатывает ошибки валидации Zod и возвращает ответ с ошибкой
 */
export function handleValidationError(
  error: unknown,
  req: Request,
  res: Response,
  context: string
): boolean {
  if (error instanceof z.ZodError) {
    logger.warn(`${context} validation error:`, {
      errors: error.errors,
      query: req.query,
      body: req.body,
    });
    res.status(400).json({
      error: "Некорректные параметры запроса",
      details: error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      })),
    });
    return true;
  }
  return false;
}

/**
 * Обрабатывает общие ошибки и возвращает ответ с ошибкой
 */
export function handleError(
  error: unknown,
  res: Response,
  defaultMessage: string,
  statusCode: number = 500
): void {
  logger.error(defaultMessage, error);
  res.status(statusCode).json({
    error:
      error instanceof Error ? error.message : defaultMessage,
  });
}

