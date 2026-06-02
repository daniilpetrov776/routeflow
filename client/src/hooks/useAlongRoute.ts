import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  addRouteWaypoint,
  getWaypointKey,
  removeRouteWaypoint,
  type AddressPoint,
} from "@/store/route-slice";
import { useToast } from "@/hooks/use-toast";
import { searchAlongRoute, type RawAlongRouteCandidate } from "@/lib/along-route/api";
import { samplePolylineForRequest } from "@/lib/along-route/sample-polyline";
import {
  distanceToRouteMeters,
  projectProgressOntoAxis,
} from "@/lib/along-route/distance-to-route";
import { computeDetour } from "@/lib/along-route/detour";
import { formatBusinessAddressDisplay } from "@/lib/address-format";
import { MAX_WAYPOINTS_PER_ROUTE } from "@shared/route-limits";
import type { AlongRouteCandidate, DetourResult } from "@/lib/along-route/types";
import type { Coordinates } from "@/types/yandex-maps";

const SEARCH_DEBOUNCE_MS = 700;
const MIN_QUERY_LENGTH = 2;
const MAX_DEVIATION_METERS = 2500;
const MAX_VISIBLE_CANDIDATES = 12;

function candidateKey(candidate: { uri?: string; coordinates: Coordinates }): string {
  return candidate.uri ?? candidate.coordinates.map((value) => value.toFixed(6)).join(",");
}

function isSamePoint(a: Coordinates, b: Coordinates): boolean {
  return Math.abs(a[0] - b[0]) < 0.0001 && Math.abs(a[1] - b[1]) < 0.0001;
}

export function useAlongRoute() {
  const dispatch = useDispatch();
  const { toast } = useToast();

  const routes = useSelector((state: RootState) => state.route.routes);
  const startingPoint = useSelector((state: RootState) => state.route.startingPoint);
  const transportMode = useSelector((state: RootState) => state.route.transportMode);
  const routeWaypoints = useSelector((state: RootState) => state.route.routeWaypoints);

  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null);
  const [searchText, setSearchTextState] = useState("");
  const [candidates, setCandidates] = useState<AlongRouteCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detour, setDetour] = useState<DetourResult | null>(null);
  const [isComputingDetour, setIsComputingDetour] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const searchSeqRef = useRef(0);
  const detourSeqRef = useRef(0);

  const activeRoute = useMemo(
    () => (activeRouteIndex !== null ? routes[activeRouteIndex] ?? null : null),
    [activeRouteIndex, routes]
  );

  const activeWaypoints = useMemo(() => {
    if (!activeRoute) {
      return [] as AddressPoint[];
    }
    return routeWaypoints[getWaypointKey(activeRoute.destination)] ?? [];
  }, [activeRoute, routeWaypoints]);

  const isOpen = activeRouteIndex !== null && Boolean(activeRoute);

  const resetSearch = useCallback(() => {
    searchSeqRef.current++;
    setCandidates([]);
    setIsSearching(false);
    setSearchError(null);
    setSelectedKey(null);
    setDetour(null);
    setIsComputingDetour(false);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    setActiveRouteIndex(null);
    setSearchTextState("");
    resetSearch();
  }, [resetSearch]);

  const openForRoute = useCallback(
    (routeIndex: number) => {
      setActiveRouteIndex(routeIndex);
      setSearchTextState("");
      resetSearch();
    },
    [resetSearch]
  );

  const runSearch = useCallback(
    async (query: string, route: typeof activeRoute) => {
      const trimmed = query.trim();
      const seq = ++searchSeqRef.current;

      if (!route || trimmed.length < MIN_QUERY_LENGTH) {
        setCandidates([]);
        setIsSearching(false);
        setSearchError(null);
        return;
      }

      const polyline = (route.geometry?.coordinates ?? []) as Coordinates[];
      if (polyline.length < 2) {
        setCandidates([]);
        setIsSearching(false);
        setSearchError("Геометрия маршрута недоступна");
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const points = samplePolylineForRequest(polyline, 8);
        const raw = await searchAlongRoute(trimmed, points);
        if (seq !== searchSeqRef.current) {
          return;
        }

        const existingPoints: Coordinates[] = [
          ...(startingPoint ? [startingPoint.coordinates] : []),
          route.destination.coordinates,
          ...(routeWaypoints[getWaypointKey(route.destination)] ?? []).map(
            (waypoint) => waypoint.coordinates
          ),
        ];

        const axisStart = startingPoint?.coordinates ?? polyline[0];
        const axisEnd = route.destination.coordinates;

        const mapped: AlongRouteCandidate[] = raw
          .map((candidate: RawAlongRouteCandidate) => {
            const deviationMeters = distanceToRouteMeters(candidate.coordinates, polyline);
            const axis = projectProgressOntoAxis(candidate.coordinates, axisStart, axisEnd);
            return {
              ...candidate,
              deviationMeters,
              distanceFromStartMeters: axis.distanceFromStartMeters,
              distanceFromEndMeters: axis.distanceFromEndMeters,
              progress: axis.progress,
            };
          })
          .filter(
            (candidate) =>
              candidate.deviationMeters <= MAX_DEVIATION_METERS &&
              !existingPoints.some((point) => isSamePoint(point, candidate.coordinates))
          )
          .sort((a, b) => a.deviationMeters - b.deviationMeters)
          .slice(0, MAX_VISIBLE_CANDIDATES);

        setCandidates(mapped);
        if (mapped.length === 0) {
          setSearchError("Ничего не найдено рядом с маршрутом");
        }
      } catch (error) {
        if (seq !== searchSeqRef.current) {
          return;
        }
        console.error("Along-route search failed:", error);
        setCandidates([]);
        setSearchError("Не удалось выполнить поиск. Попробуйте ещё раз.");
      } finally {
        if (seq === searchSeqRef.current) {
          setIsSearching(false);
        }
      }
    },
    [routeWaypoints, startingPoint]
  );

  const setSearchText = useCallback(
    (text: string) => {
      setSearchTextState(text);
      setSelectedKey(null);
      setDetour(null);

      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      const routeForSearch = activeRoute;
      debounceRef.current = window.setTimeout(() => {
        void runSearch(text, routeForSearch);
      }, SEARCH_DEBOUNCE_MS);
    },
    [activeRoute, runSearch]
  );

  const selectCandidate = useCallback(
    async (candidate: AlongRouteCandidate) => {
      if (!activeRoute || !startingPoint) {
        return;
      }

      const key = candidateKey(candidate);
      setSelectedKey(key);
      setDetour(null);
      setIsComputingDetour(true);

      const seq = ++detourSeqRef.current;
      const viaPoint: AddressPoint = {
        address: formatBusinessAddressDisplay(candidate.name, candidate.fullAddress),
        coordinates: candidate.coordinates,
      };

      try {
        const result = await computeDetour(
          startingPoint,
          viaPoint,
          activeRoute.destination,
          transportMode,
          { duration: activeRoute.duration, distance: activeRoute.distance }
        );
        if (seq !== detourSeqRef.current) {
          return;
        }
        setDetour(result);
      } finally {
        if (seq === detourSeqRef.current) {
          setIsComputingDetour(false);
        }
      }
    },
    [activeRoute, startingPoint, transportMode]
  );

  const addCandidate = useCallback(
    (candidate: AlongRouteCandidate) => {
      if (!activeRoute) {
        return;
      }

      const currentWaypoints = routeWaypoints[getWaypointKey(activeRoute.destination)] ?? [];
      if (currentWaypoints.length >= MAX_WAYPOINTS_PER_ROUTE) {
        toast({
          variant: "destructive",
          title: "Достигнут лимит заездов",
          description: `Можно добавить не более ${MAX_WAYPOINTS_PER_ROUTE} заездов на маршрут.`,
        });
        return;
      }

      const point: AddressPoint = {
        address: formatBusinessAddressDisplay(candidate.name, candidate.fullAddress),
        coordinates: candidate.coordinates,
      };

      dispatch(addRouteWaypoint({ destination: activeRoute.destination, point }));
      toast({
        title: "Заезд добавлен",
        description: `${candidate.name} добавлен в маршрут. Пересчитываем…`,
      });

      setCandidates((prev) =>
        prev.filter((item) => candidateKey(item) !== candidateKey(candidate))
      );
      setSelectedKey(null);
      setDetour(null);
    },
    [activeRoute, dispatch, routeWaypoints, toast]
  );

  const removeWaypoint = useCallback(
    (waypointIndex: number) => {
      if (!activeRoute) {
        return;
      }
      dispatch(
        removeRouteWaypoint({ destination: activeRoute.destination, waypointIndex })
      );
    },
    [activeRoute, dispatch]
  );

  // Закрываем панель, если активный маршрут пропал (например, удалён пункт)
  useEffect(() => {
    if (activeRouteIndex !== null && !routes[activeRouteIndex]) {
      close();
    }
  }, [activeRouteIndex, routes, close]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    activeRoute,
    activeRouteIndex,
    activeWaypoints,
    searchText,
    candidates,
    isSearching,
    searchError,
    selectedKey,
    detour,
    isComputingDetour,
    openForRoute,
    close,
    setSearchText,
    selectCandidate,
    addCandidate,
    removeWaypoint,
    candidateKey,
  };
}
