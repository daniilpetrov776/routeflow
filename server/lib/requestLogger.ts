// src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from "express";
import util from "util";
import logger from "./logger";

const MAX_INSPECT_LENGTH = 2000;

function inspectTrim(obj: any) {
  if (obj === undefined) return undefined;
  try {
    const inspected = util.inspect(obj, {
      depth: 4,
      maxArrayLength: 50,
      compact: false,
      breakLength: 80,
    });
    return inspected.length > MAX_INSPECT_LENGTH
      ? inspected.slice(0, MAX_INSPECT_LENGTH) + "\n…(truncated)"
      : inspected;
  } catch {
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }
}

// На случай, если где-то уже произошло двойное экранирование и в строке лежит '\'+'n'
function unescapeSlashedNewlines(s?: string) {
  if (!s || typeof s !== "string") return s;
  // заменим "\\n" -> "\n" и "\\t" -> "\t" (безопасно)
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

export default function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const path = req.path;

  const originalJson = res.json.bind(res);
  let capturedJson: any = undefined;
  res.json = function (body: any) {
    capturedJson = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;

    const duration = Date.now() - start;
    const msg = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

    // Подготавливаем превью объектов (inspect) — это уже многострочная строка
    const reqBodyPreview = req.body && Object.keys(req.body || {}).length ? inspectTrim(req.body) : undefined;
    let responsePreview = capturedJson ? inspectTrim(capturedJson) : undefined;

    // Убираем двойные слеши, если они есть (когда раньше делали JSON.stringify)
    if (typeof responsePreview === "string") {
      responsePreview = unescapeSlashedNewlines(responsePreview);
    }

    // Соберём сообщение: основной заголовок + отдельно длинные превью как новые строки
    const parts: string[] = [msg];
    if (req.params && Object.keys(req.params).length) parts.push(`params: ${inspectTrim(req.params)}`);
    if (req.query && Object.keys(req.query as any).length) parts.push(`query: ${inspectTrim(req.query)}`);
    if (reqBodyPreview) parts.push(`requestBody:\n${reqBodyPreview}`);
    if (responsePreview) parts.push(`response:\n${responsePreview}`);

    // Логируем единым многострочным сообщением (в pretty mode будет красиво)
    logger.info(parts.join("\n\n"));
  });

  next();
}
