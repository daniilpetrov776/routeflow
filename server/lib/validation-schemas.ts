import { z } from "zod";
import routeLimits from "@shared/route-limits";

const { MAX_DESTINATIONS, MAX_DESTINATIONS_MESSAGE } = routeLimits;

/**
 * Схема для валидации координат [широта, долгота]
 */
export const coordinatesSchema = z.tuple([
  z.number().min(-90).max(90), // широта: от -90 до 90
  z.number().min(-180).max(180), // долгота: от -180 до 180
]);

/**
 * Схема для валидации точки адреса
 */
export const addressPointSchema = z.object({
  address: z.string().min(1).max(500).trim(), // адрес от 1 до 500 символов
  coordinates: coordinatesSchema,
});

/**
 * Схема для валидации режима транспорта
 */
export const transportModeSchema = z.enum([
  "walking",
  "cycling",
  "transit",
  "driving",
]);

/**
 * Схема для валидации запроса расчета маршрутов
 */
export const routeRequestSchema = z.object({
  startingPoint: addressPointSchema,
  destinations: z
    .array(addressPointSchema)
    .min(1, "Должен быть хотя бы один пункт назначения")
    .max(MAX_DESTINATIONS, MAX_DESTINATIONS_MESSAGE),
  transportMode: transportModeSchema,
});

/**
 * Схема для валидации query параметра адреса (геокодирование)
 */
export const geocodeQuerySchema = z.object({
  address: z
    .string()
    .min(1, "Адрес не может быть пустым")
    .max(500, "Адрес слишком длинный")
    .trim(),
});

/**
 * Схема для валидации query параметра текста (предложения)
 */
export const suggestQuerySchema = z.object({
  text: z
    .string()
    .min(1, "Текст запроса не может быть пустым")
    .max(500, "Текст запроса слишком длинный")
    .trim(),
});

