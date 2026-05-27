/**
 * Форматирует длительность в секундах в читаемый формат
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} ч`;
  return `${hours} ч ${remainingMinutes} мин`;
};

/**
 * Форматирует расстояние в метрах в читаемый формат
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} м`;

  const kilometers = meters / 1000;
  const rounded = Math.round(kilometers * 10) / 10;
  return `${rounded.toLocaleString("ru-RU", {
    maximumFractionDigits: 1,
  })} км`;
};

