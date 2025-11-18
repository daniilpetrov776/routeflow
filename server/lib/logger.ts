// src/logger.ts
import { createLogger, format, transports } from "winston";
import util from "util";

const isProd = process.env.NODE_ENV === "production";

const prettyFormat = format.printf((info) => {
  const { timestamp, level, message, ...meta } = info;

  // если есть мета — красиво распечатать через util.inspect (даст реальные переносы)
  const metaKeys = Object.keys(meta);
  let metaStr = "";
  if (metaKeys.length) {
    // util.inspect вернёт многострочный читаемый вывод для объектов/строк
    metaStr = "\n" + util.inspect(meta, {
      depth: 4,
      maxArrayLength: 50,
      compact: false,
      breakLength: 80,
    });
  }

  return `${timestamp} ${level}: ${message}${metaStr}`;
});

const logger = createLogger({
  level: isProd ? "info" : "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    isProd
      ? format.json() // в проде оставляем JSON (для агрегаторов)
      : format.combine(format.colorize({ all: true }), prettyFormat)
  ),
  transports: [new transports.Console()],
  exitOnError: false,
});

export default logger;