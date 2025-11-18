import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setRoutes, setCalculating } from "@/store/route-slice";
import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Crosshair } from "lucide-react";
import type { AddressPoint, RouteOption } from "@/store/route-slice";

interface MapContainerProps {
  isLoaded: boolean;
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
}

export function MapContainer({
  isLoaded,
  startingPoint,
  destinations
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const yandexMapRef = useRef<any>(null);
  const routesRef = useRef<any[]>([]);
  const dispatch = useDispatch();

  // 1. Новые хуки для динамической перекраски
  const calculatedRoutes = useSelector((state: RootState) => state.route.routes);
  const { isCalculating, transportMode } = useSelector((state: RootState) => state.route);

  // 2. Индекс самого быстрого маршрута
  const fastestIndex = calculatedRoutes.length > 0
    ? calculatedRoutes.reduce(
        (bestIdx, _, i) =>
          calculatedRoutes[i].duration < calculatedRoutes[bestIdx].duration
            ? i
            : bestIdx,
        0
      )
    : 0;

  // 3. Эффект для обновления стилей уже отрисованных маршрутов
  useEffect(() => {
    if (!yandexMapRef.current) return;

    routesRef.current.forEach((multiRouteObj, idx) => {
      const isFastest = idx === fastestIndex;
      multiRouteObj.options.set({
        routeActiveStrokeColor: isFastest ? '#28a745' : '#007bff',
        routeActiveStrokeWidth: isFastest ? 6 : 4,
        opacity:                isFastest ? 1.0  : 0.7,
      });
    });
  }, [calculatedRoutes, fastestIndex]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const initMap = () => {
      // @ts-ignore
      yandexMapRef.current = new ymaps.Map(mapRef.current, {
        center: [55.76, 37.64],
        zoom: 10,
        controls: []
      });
    };

    // @ts-ignore
    if (window.ymaps) ymaps.ready(initMap);

    return () => {
      if (yandexMapRef.current) {
        yandexMapRef.current.destroy();
      }
    };
  }, [isLoaded]);

  const calculateRoutes = async () => {
    if (!yandexMapRef.current || !startingPoint) return;
  
    const validDestinations = destinations.filter(
      d => d.address && d.address.trim() !== ''
    );
    if (validDestinations.length === 0) return;
  
    dispatch(setCalculating(true));
  
    // 1) Сначала очищаем старые маршруты
    routesRef.current.forEach(route => {
      yandexMapRef.current.geoObjects.remove(route);
    });
    routesRef.current = [];
  
    // 2) Подготавливаем массив результатов нужной длины
    const routeResults: Array<RouteOption | null> = new Array(validDestinations.length).fill(null);
    let completed = 0;
  
    for (let i = 0; i < validDestinations.length; i++) {
      const destination = validDestinations[i];
  
      // Преобразуем transportMode в формат Yandex
      let routingMode: "auto" | "pedestrian" | "bicycle" | "masstransit" = "auto";
      switch (transportMode) {
        case "walking":
          routingMode = "pedestrian";
          break;
        case "cycling":
          routingMode = "bicycle";
          break;
        case "transit":
          routingMode = "masstransit";
          break;
        case "driving":
        default:
          routingMode = "auto";
      }
  
      // 3) Создаем MultiRoute
      // @ts-ignore
      const route = new ymaps.multiRouter.MultiRoute(
        {
          referencePoints: [
            startingPoint.coordinates,
            destination.coordinates,
          ],
          params: {
            routingMode,
            avoidTrafficJams: true,
          },
        },
        {
          wayPointStartIconColor: "#28a745",
          wayPointFinishIconColor: "#dc3545",
          routeActiveStrokeColor: i === 0 ? "#28a745" : "#007bff",
          routeActiveStrokeWidth: i === 0 ? 6 : 4,
          opacity: i === 0 ? 1.0 : 0.7,
        }
      );
  
      // Добавляем маршрут на карту и в ref
      yandexMapRef.current.geoObjects.add(route);
      routesRef.current.push(route);
  
      // 4) Обработка успешного расчёта
      route.model.events.add("requestsuccess", () => {
        const activeRoute = route.getActiveRoute();
        if (!activeRoute) return;
  
        // Формируем объект результата и сохраняем по индексу i
        const opt: RouteOption = {
          id: `route-${i}`,
          destination,
          duration: activeRoute.properties.get("duration")?.value || 0,
          distance: activeRoute.properties.get("distance")?.value || 0,
          traffic_info: {
            level: activeRoute.properties.get("blocked") ? "heavy" : "light",
          },
          geometry: {
            coordinates: [
              startingPoint.coordinates,
              destination.coordinates,
            ],
          },
        };
        routeResults[i] = opt;
        completed++;
  
        // Когда все маршруты готовы — диспатчим и обновляем стили
        if (completed === validDestinations.length) {
          // 5) Сохраняем результаты в Redux
          dispatch(setRoutes(routeResults as RouteOption[]));
          dispatch(setCalculating(false));
  
          // 6) Локально выделяем самый быстрый маршрут без ожидания дополнительного render
          const fastestIdx = (routeResults as RouteOption[]).reduce(
            (best, _, idx, arr) =>
              arr[idx].duration < arr[best].duration ? idx : best,
            0
          );
  
          routesRef.current.forEach((multi, idx) => {
            multi.options.set({
              routeActiveStrokeColor:
                idx === fastestIdx ? "#28a745" : "#007bff",
              routeActiveStrokeWidth: idx === fastestIdx ? 6 : 4,
              opacity: idx === fastestIdx ? 1.0 : 0.7,
            });
          });
        }
      });
  
      // 7) Обработка ошибок расчёта
      route.model.events.add("requestfail", () => {
        console.error(`Failed to calculate route #${i}`);
        // Если это последний по порядку запрос, снимаем состояние calculating
        if (completed + 1 === validDestinations.length) {
          dispatch(setCalculating(false));
        }
      });
    }
  
    // 8) Подогнать границы карты под все маршруты
    setTimeout(() => {
      const bounds = yandexMapRef.current.geoObjects.getBounds();
      if (bounds) {
        yandexMapRef.current.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: 50,
        });
      }
    }, 1000);
  };

  useEffect(() => {
    if (!yandexMapRef.current || !startingPoint) return;

    yandexMapRef.current.geoObjects.removeAll();
    routesRef.current = [];

    // стартовый маркер
    // @ts-ignore
    const startMarker = new ymaps.Placemark(
      startingPoint.coordinates,
      { balloonContent: `<strong>Начальная точка</strong><br/>${startingPoint.address}`, iconCaption: 'Старт' },
      { preset: 'islands#greenCircleDotIconWithCaption', iconCaptionMaxWidth: '200' }
    );
    yandexMapRef.current.geoObjects.add(startMarker);

    // маркеры для пунктов назначения
    destinations.forEach((dest, index) => {
      if (dest.address?.trim()) {
        // @ts-ignore
        const destMarker = new ymaps.Placemark(
          dest.coordinates,
          { balloonContent: `<strong>Пункт назначения ${index + 1}</strong><br/>${dest.address}`, iconCaption: `${index + 1}` },
          { preset: 'islands#redCircleDotIconWithCaption', iconCaptionMaxWidth: '200' }
        );
        yandexMapRef.current.geoObjects.add(destMarker);
      }
    });

    // запустить расчёт, если есть валидные адреса
    const validDestinations = destinations.filter(d => d.address?.trim());
    if (validDestinations.length > 0) {
      calculateRoutes();
    }

    yandexMapRef.current.setCenter(startingPoint.coordinates, 12, { duration: 300 });
  }, [startingPoint, destinations, transportMode]);

  // Контролы зума и центровки
  const handleZoomIn = () => {
    if (yandexMapRef.current) yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() + 1);
  };
  const handleZoomOut = () => {
    if (yandexMapRef.current) yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() - 1);
  };
  const handleCenter = () => {
    if (yandexMapRef.current && startingPoint) yandexMapRef.current.setCenter(startingPoint.coordinates);
  };

  return (
    <div className="flex-1 relative">
      <div ref={mapRef} className="w-full h-full bg-muted" style={{ minHeight: '100%' }} />

      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 flex items-center justify-center">
          <div className="text-center bg-card p-8 rounded-lg shadow-lg border">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Interactive Map</h3>
            <p className="text-muted-foreground mb-4">Map will display here once routes are calculated</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Starting Point</span>
              <div className="w-2 h-2 bg-red-500 rounded-full ml-4"></div>
              <span>Destinations</span>
            </div>
          </div>
        </div>
      )}

      {isCalculating && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Calculating routes...</p>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <Button variant="outline" size="icon" onClick={handleZoomIn} className="bg-background border shadow-lg">
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} className="bg-background border shadow-lg">
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleCenter} className="bg-background border shadow-lg">
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>

    </div>
  );
}
