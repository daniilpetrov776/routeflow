import { setRoutes, setCalculating } from "@/store/route-slice";
import { showRouteError } from "@/lib/error-toast";
import type { AddressPoint, RouteOption, TransportMode } from "@/store/route-slice";
import type { YandexEvent } from "@/types/yandex-maps";

/**
 * Обработчик ошибки расчета маршрута
 */
export const createRouteErrorHandler = (
  routeIndex: number,
  startingPoint: AddressPoint,
  destination: AddressPoint,
  routingMode: "auto" | "pedestrian" | "bicycle" | "masstransit",
  transportMode: TransportMode,
  routeResults: Array<RouteOption | null>,
  completedRef: { current: number },
  totalDestinations: number,
  dispatch: any
) => {
  return (event?: YandexEvent) => {
    const errorDetails = event?.get('error') || 'Unknown error';
    const errorMessage = `Не удалось рассчитать маршрут до пункта назначения #${routeIndex + 1}`;
    
    console.error(errorMessage, {
      from: startingPoint.coordinates,
      to: destination.coordinates,
      routingMode,
      transportMode,
      error: errorDetails,
    });
    
    // Показываем ошибку только если это не временная проблема сети
    // (retry логика должна обработать временные сбои)
    const errorStr = typeof errorDetails === 'string' ? errorDetails : String(errorDetails);
    if (errorStr.includes('network') || errorStr.includes('timeout')) {
      console.warn(`Network error for route #${routeIndex + 1}, retry logic should handle this`);
    } else {
      // Для других ошибок показываем более информативное сообщение
      const modeNames: Record<string, string> = {
        'auto': 'автомобиль',
        'pedestrian': 'пешком',
        'bicycle': 'велосипед',
        'masstransit': 'общественный транспорт',
      };
      const modeName = modeNames[routingMode] || transportMode;
      showRouteError(
        `${errorMessage} (режим: ${modeName}). Проверьте, доступен ли маршрут для выбранного режима транспорта.`
      );
    }
    
    completedRef.current++;
    // Если все маршруты завершились (успешно или с ошибкой)
    if (completedRef.current === totalDestinations) {
      // Сохраняем результаты, даже если некоторые маршруты не удалось рассчитать
      const validResults = routeResults.filter((r): r is RouteOption => r !== null);
      if (validResults.length > 0) {
        dispatch(setRoutes(validResults));
      } else {
        // Если ни один маршрут не был рассчитан, показываем общую ошибку
        showRouteError(
          "Не удалось рассчитать ни один маршрут. Проверьте корректность адресов и режим транспорта.",
          true
        );
      }
      dispatch(setCalculating(false));
    }
  };
};

