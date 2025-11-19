import { toast } from "@/hooks/use-toast";

/**
 * Стандартная длительность показа toast-уведомлений об ошибках (5 секунд)
 */
const DEFAULT_ERROR_DURATION = 5000;

/**
 * Показывает toast с ошибкой загрузки карты Yandex Maps
 */
export function showMapLoadError(message: string): void {
  toast({
    variant: "destructive",
    title: "Ошибка загрузки карты",
    description: message,
    duration: DEFAULT_ERROR_DURATION,
  });
}

/**
 * Показывает toast с ошибкой расчета маршрута
 * @param message - Сообщение об ошибке
 * @param isMultiple - Если true, используется заголовок "Ошибка расчета маршрутов" (множественное число)
 */
export function showRouteError(message: string, isMultiple: boolean = false): void {
  toast({
    variant: "destructive",
    title: isMultiple ? "Ошибка расчета маршрутов" : "Ошибка расчета маршрута",
    description: message,
    duration: DEFAULT_ERROR_DURATION,
  });
}

/**
 * Показывает toast с общей ошибкой (для кастомных случаев)
 */
export function showError(title: string, description: string, duration?: number): void {
  toast({
    variant: "destructive",
    title,
    description,
    duration: duration ?? DEFAULT_ERROR_DURATION,
  });
}

