import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import {
  setStartingPoint,
  setDestinations,
  setTransportMode,
  clearRoutes,
  AddressPoint,
  TransportMode,
} from "@/store/route-slice";
import { setItem, getItem } from "@/lib/localStorage";

const CURRENT_ROUTE_STATE_KEY = "routeflow_current_route_state";

interface SavedRouteState {
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
  transportMode: TransportMode;
  // routes не сохраняем, чтобы они пересчитывались при загрузке
}

/**
 * Компонент для тихого сохранения и загрузки введенных точек маршрута.
 * Сами рассчитанные маршруты не сохраняются, чтобы карта пересчитала их заново.
 */
export function RoutePersistence() {
  const dispatch = useDispatch();
  const routeState = useSelector((state: RootState) => state.route);
  const isInitialMount = useRef(true);
  const hasLoadedState = useRef(false);

  // Загрузка состояния при монтировании
  useEffect(() => {
    try {
      const savedState = getItem<SavedRouteState>(CURRENT_ROUTE_STATE_KEY);
      if (savedState) {
        // Загружаем только если текущее состояние пустое
        const currentState = routeState;
        const isEmpty = 
          !currentState.startingPoint && 
          currentState.destinations.length === 0 &&
          currentState.routes.length === 0;

        if (isEmpty) {
          hasLoadedState.current = true;
          
          // Очищаем старые маршруты перед загрузкой
          dispatch(clearRoutes());
          
          // Устанавливаем режим транспорта сразу
          dispatch(setTransportMode(savedState.transportMode));
          
          // Устанавливаем значения последовательно с задержками,
          // чтобы map-container успел обработать каждое изменение
          // и пересчитать маршруты на карте
          // Используем более длинные задержки, чтобы дать время карте инициализироваться
          
          // 1. Сначала устанавливаем начальную точку
          if (savedState.startingPoint) {
            setTimeout(() => {
              dispatch(setStartingPoint(savedState.startingPoint!));
              
              // 2. Затем через задержку устанавливаем все destinations сразу
              // Задержка должна быть достаточной, чтобы карта успела обработать startingPoint
              setTimeout(() => {
                if (savedState.destinations.length > 0) {
                  dispatch(setDestinations(savedState.destinations));
                }
              }, 500); // Увеличена задержка после установки startingPoint
            }, 200); // Увеличена начальная задержка
          } else if (savedState.destinations.length > 0) {
            // Если нет startingPoint, но есть destinations, устанавливаем их
            setTimeout(() => {
              dispatch(setDestinations(savedState.destinations));
            }, 200);
          }
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке сохраненных маршрутов:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Сохранение состояния при изменении введенных точек
  useEffect(() => {
    // Пропускаем сохранение при первой загрузке, чтобы не перезаписать загруженные данные
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Если мы загрузили состояние, не сохраняем сразу
      if (hasLoadedState.current) {
        return;
      }
    }

    try {
      const stateToSave: SavedRouteState = {
        startingPoint: routeState.startingPoint,
        destinations: routeState.destinations,
        transportMode: routeState.transportMode,
        // routes не сохраняем - они будут пересчитаны при загрузке
      };
      setItem(CURRENT_ROUTE_STATE_KEY, stateToSave);
    } catch (error) {
      console.error("Ошибка при сохранении маршрута:", error);
    }
  }, [
    routeState.startingPoint,
    routeState.destinations,
    routeState.transportMode,
    // routeState.routes не включаем в зависимости, так как не сохраняем
    dispatch,
  ]);

  return null; // Компонент не рендерит ничего
}

