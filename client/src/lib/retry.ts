/**
 * Утилиты для повторных попыток выполнения запросов
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
  maxRetries: 3,
  retryDelay: 1000,
  retryDelayMultiplier: 2,
  maxRetryDelay: 10000,
  shouldRetry: (error: unknown) => {
    // Повторяем для сетевых ошибок и ошибок сервера (5xx), но не для клиентских ошибок (4xx)
    if (error instanceof Error) {
      // Сетевые ошибки
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return true;
      }
      // Ошибки сервера (5xx)
      if (error.message.match(/^5\d{2}:/)) {
        return true;
      }
      // Rate limiting (429) - повторяем
      if (error.message.match(/^429:/)) {
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
  options: RetryOptions = {}
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
        throw error;
      }

      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === opts.maxRetries) {
        throw error;
      }

      // Вычисляем задержку перед следующей попыткой
      const delay = calculateRetryDelay(attempt, opts);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

