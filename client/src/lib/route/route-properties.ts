import type { YandexRoute } from "@/types/yandex-maps";

/**
 * Извлекает значение длительности из свойства маршрута
 */
export const extractDuration = (route: YandexRoute): number => {
  const durationProp = route.properties.get("duration");
  
  if (typeof durationProp === 'object' && durationProp !== null && 'value' in durationProp) {
    return durationProp.value || 0;
  }
  
  return 0;
};

/**
 * Извлекает значение расстояния из свойства маршрута
 */
export const extractDistance = (route: YandexRoute): number => {
  const distanceProp = route.properties.get("distance");
  
  if (typeof distanceProp === 'object' && distanceProp !== null && 'value' in distanceProp) {
    return distanceProp.value || 0;
  }
  
  return 0;
};

/**
 * Извлекает информацию о блокировке маршрута
 */
export const extractBlockedStatus = (route: YandexRoute): boolean => {
  const blockedProp = route.properties.get("blocked");
  return typeof blockedProp === 'boolean' ? blockedProp : false;
};

/**
 * Извлекает все свойства маршрута
 */
export const extractRouteProperties = (route: YandexRoute) => {
  return {
    duration: extractDuration(route),
    distance: extractDistance(route),
    isBlocked: extractBlockedStatus(route),
  };
};

