import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import logger from "./logger";

/**
 * Общий rate limiter для всех API запросов
 * Защита от DDoS атак
 */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 200, // максимум 200 запросов в минуту с одного IP
  message: "Слишком много запросов с вашего IP, попробуйте позже",
  standardHeaders: true, // Возвращает информацию о лимите в заголовках `RateLimit-*`
  legacyHeaders: false, // Отключает заголовки `X-RateLimit-*`
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: "Слишком много запросов с вашего IP, попробуйте позже",
    });
  },
});

/**
 * Rate limiter для suggest роута
 * Более мягкий лимит, так как запросы отправляются с дебаунсом при вводе адреса
 */
export const suggestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 100, // максимум 100 запросов в минуту с одного IP
  message: "Слишком много запросов для поиска адресов, попробуйте позже",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Suggest rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      error: "Слишком много запросов для поиска адресов, попробуйте позже",
    });
  },
});

/**
 * Rate limiter для geocode роута
 */
export const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 30, // максимум 30 запросов в минуту с одного IP
  message: "Слишком много запросов геокодирования, попробуйте позже",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Geocode rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      error: "Слишком много запросов геокодирования, попробуйте позже",
    });
  },
});

/**
 * Rate limiter для routes роута
 * Средний лимит, так как это более тяжелая операция
 */
export const routesLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 20, // максимум 20 запросов в минуту с одного IP
  message: "Слишком много запросов расчета маршрутов, попробуйте позже",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Routes rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      error: "Слишком много запросов расчета маршрутов, попробуйте позже",
    });
  },
});

/**
 * Rate limiter для along-route роута
 * Каждый запрос порождает несколько обращений к Yandex (коридорный поиск),
 * поэтому лимит строже.
 */
export const alongRouteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 20, // максимум 20 запросов в минуту с одного IP
  message: "Слишком много запросов поиска по пути, попробуйте позже",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Along-route rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      error: "Слишком много запросов поиска по пути, попробуйте позже",
    });
  },
});

/**
 * Rate limiter для yandex-maps/config роута
 * Более строгий лимит, так как используется редко (при загрузке страницы)
 */
export const yandexMapsConfigLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 10, // максимум 10 запросов в минуту с одного IP
  message: "Слишком много запросов конфигурации, попробуйте позже",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Yandex Maps config rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      error: "Слишком много запросов конфигурации, попробуйте позже",
    });
  },
});

