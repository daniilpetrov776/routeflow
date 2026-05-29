import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import requestLogger from "lib/requestLogger";
import logger from "lib/logger";
import { generalApiLimiter } from "./lib/rateLimiter";

const app = express();

// Настройка CORS для клиента
const defaultDevOrigins = ["http://localhost:5173", "http://localhost:3000"];

function isPrivateNetworkOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") {
      return false;
    }

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
    );
  } catch {
    return false;
  }
}

const envOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? envOrigins.length > 0
      ? envOrigins
      : [process.env.CLIENT_URL || "https://your-client-domain.com"]
    : envOrigins.length > 0
      ? envOrigins
      : defaultDevOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV !== "production" && isPrivateNetworkOrigin(origin))
    ) {
      return callback(null, origin ?? allowedOrigins[0]);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(requestLogger);

// Применяем общий rate limiter для всех API запросов
app.use("/api", generalApiLimiter);

// Регистрируем роуты
(async () => {
  const server = await registerRoutes(app);

  // централизованный error handler — теперь пишет через logger
  app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Логируем полную ошибку (с трассой)
    logger.error(`Error ${status} on ${_req.method} ${_req.path}: ${message}`, {
      stack: err.stack,
      name: err.name,
      // при необходимости можно добавлять больше полей
    });

    res.status(status).json({ message });
  });

  const port = parseInt(process.env.PORT || "5001", 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    logger.info(`🚀 Server running on port ${port}`);
    logger.info(`📱 API available at http://localhost:${port}/api`);
  });
})();
