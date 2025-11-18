/**
 * Вычисляет расстояние между двумя точками по формуле Haversine
 * @param lat1 Широта первой точки
 * @param lon1 Долгота первой точки
 * @param lat2 Широта второй точки
 * @param lon2 Долгота второй точки
 * @returns Расстояние в метрах
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Радиус Земли в метрах
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Вычисляет длительность маршрута на основе расстояния и режима транспорта
 * @param distance Расстояние в метрах
 * @param mode Режим транспорта
 * @returns Длительность в секундах
 */
export const calculateDuration = (distance: number, mode: string): number => {
  const speeds = {
    walking: 5, // km/h
    cycling: 15,
    transit: 25,
    driving: 40,
  };
  const speed = speeds[mode as keyof typeof speeds] || 25;
  return (distance / 1000 / speed) * 3600; // секунды
};

/**
 * Форматирует длительность в читаемый формат
 * @param seconds Длительность в секундах
 * @returns Отформатированная строка
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}ч ${remainingMinutes}м`;
};

/**
 * Форматирует расстояние в читаемый формат
 * @param meters Расстояние в метрах
 * @returns Отформатированная строка
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(1)} км`;
};

