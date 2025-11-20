import logger from "./logger";

/**
 * Утилиты для повторных попыток выполнения запросов на сервере
 */

export interface RetryOptions {
  /** Максимальное количество попыток (по умолчанию 3) */
  maxRetries?: number;
  /** Задержка перед повторной попыткой в миллисекундах (по умолчанию 1000) */
  retryDelay?: number;
  /** Множитель для экспоненциальной задержки (по умолчанию 2) */
  retryDelayMultiplier?: number;
  /** Максимальная задержка в миллисекундах (по умолчанию 10000) */
  maxRetryDelay?: number;
  /** Функция для определения, нужно ли повторять попытку для данной ошибки */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 5,
  retryDelay: 1000,
  retryDelayMultiplier: 2,
  maxRetryDelay: 10000,
  shouldRetry: (error: unknown) => {
    // Повторяем для сетевых ошибок и ошибок сервера (5xx), но не для клиентских ошибок (4xx)
    if (error instanceof Error) {
      // Сетевые ошибки
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        return true;
      }
      // Ошибки сервера (5xx)
      if (error.message.match(/5\d{2}/)) {
        return true;
      }
      // Rate limiting (429) - повторяем
      if (error.message.match(/429/)) {
        return true;
      }
    }
    return false;
  },
};

/**
 * Вычисляет задержку перед следующей попыткой с экспоненциальным backoff
 */
function calculateRetryDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.retryDelay * Math.pow(options.retryDelayMultiplier, attempt - 1);
  return Math.min(delay, options.maxRetryDelay);
}

/**
 * Выполняет функцию с повторными попытками при ошибках
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context?: string
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Проверяем, нужно ли повторять попытку
      if (!opts.shouldRetry(error, attempt)) {
        logger.warn(`${context || 'Request'} failed (attempt ${attempt}/${opts.maxRetries}):`, error);
        throw error;
      }

      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === opts.maxRetries) {
        logger.error(`${context || 'Request'} failed after ${opts.maxRetries} attempts:`, error);
        throw error;
      }

      // Вычисляем задержку перед следующей попыткой
      const delay = calculateRetryDelay(attempt, opts);
      logger.info(`${context || 'Request'} failed (attempt ${attempt}/${opts.maxRetries}), retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

