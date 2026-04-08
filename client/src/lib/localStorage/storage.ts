/**
 * Библиотека для работы с localStorage
 * Предоставляет типизированные функции для сохранения и загрузки данных
 */

/**
 * Проверяет доступность localStorage
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Базовый класс ошибки localStorage
 */
export class LocalStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalStorageError';
  }
}

/**
 * Сохраняет значение в localStorage
 * @param key - Ключ для сохранения
 * @param value - Значение для сохранения (будет сериализовано в JSON)
 * @throws {LocalStorageError} Если localStorage недоступен или произошла ошибка при сохранении
 */
export function setItem<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) {
    throw new LocalStorageError('localStorage недоступен в данном окружении');
  }

  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (error) {
    if (error instanceof Error) {
      throw new LocalStorageError(`Ошибка при сохранении в localStorage: ${error.message}`);
    }
    throw new LocalStorageError('Неизвестная ошибка при сохранении в localStorage');
  }
}

/**
 * Загружает значение из localStorage
 * @param key - Ключ для загрузки
 * @returns Значение или null, если ключ не найден
 * @throws {LocalStorageError} Если localStorage недоступен или произошла ошибка при загрузке
 */
export function getItem<T>(key: string): T | null {
  if (!isLocalStorageAvailable()) {
    throw new LocalStorageError('localStorage недоступен в данном окружении');
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new LocalStorageError(`Ошибка при загрузке из localStorage: ${error.message}`);
    }
    throw new LocalStorageError('Неизвестная ошибка при загрузке из localStorage');
  }
}

/**
 * Загружает значение из localStorage с значением по умолчанию
 * @param key - Ключ для загрузки
 * @param defaultValue - Значение по умолчанию, если ключ не найден
 * @returns Значение или defaultValue
 * @throws {LocalStorageError} Если localStorage недоступен или произошла ошибка при загрузке
 */
export function getItemWithDefault<T>(key: string, defaultValue: T): T {
  const item = getItem<T>(key);
  return item !== null ? item : defaultValue;
}

/**
 * Удаляет значение из localStorage
 * @param key - Ключ для удаления
 * @throws {LocalStorageError} Если localStorage недоступен
 */
export function removeItem(key: string): void {
  if (!isLocalStorageAvailable()) {
    throw new LocalStorageError('localStorage недоступен в данном окружении');
  }

  try {
    localStorage.removeItem(key);
  } catch (error) {
    if (error instanceof Error) {
      throw new LocalStorageError(`Ошибка при удалении из localStorage: ${error.message}`);
    }
    throw new LocalStorageError('Неизвестная ошибка при удалении из localStorage');
  }
}

/**
 * Очищает весь localStorage
 * @throws {LocalStorageError} Если localStorage недоступен
 */
export function clear(): void {
  if (!isLocalStorageAvailable()) {
    throw new LocalStorageError('localStorage недоступен в данном окружении');
  }

  try {
    localStorage.clear();
  } catch (error) {
    if (error instanceof Error) {
      throw new LocalStorageError(`Ошибка при очистке localStorage: ${error.message}`);
    }
    throw new LocalStorageError('Неизвестная ошибка при очистке localStorage');
  }
}

/**
 * Проверяет наличие ключа в localStorage
 * @param key - Ключ для проверки
 * @returns true, если ключ существует
 */
export function hasItem(key: string): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Получает все ключи из localStorage
 * @returns Массив всех ключей
 */
export function getAllKeys(): string[] {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) {
        keys.push(key);
      }
    }
    return keys;
  } catch {
    return [];
  }
}






