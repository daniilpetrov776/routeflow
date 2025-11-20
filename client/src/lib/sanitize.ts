import DOMPurify from "dompurify";

/**
 * Санитизирует HTML строку, удаляя потенциально опасные теги и атрибуты
 * Используется для защиты от XSS атак при отображении данных из внешних API
 * 
 * @param dirty - HTML строка для санитизации
 * @returns Санитизированная строка
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    // Разрешаем только безопасные теги для форматирования
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "br", "p"],
    // Разрешаем только безопасные атрибуты
    ALLOWED_ATTR: [],
    // Запрещаем data-* атрибуты
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
}

/**
 * Санитизирует обычный текст, экранируя HTML символы
 * Используется для безопасного отображения текста в HTML контексте
 * 
 * @param text - Текст для санитизации
 * @returns Санитизированный текст без HTML
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  // DOMPurify автоматически экранирует HTML символы при санитизации
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

