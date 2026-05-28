/**
 * Типы для Yandex Maps API
 * Основаны на официальной документации Yandex Maps API 2.1
 */

/**
 * Координаты точки [широта, долгота]
 */
export type Coordinates = [number, number];

/**
 * Опции для Placemark
 */
export interface PlacemarkOptions {
  balloonContent?: string;
  iconCaption?: string;
  hintContent?: string;
  [key: string]: unknown;
}

/**
 * Параметры иконки Placemark
 */
export interface PlacemarkPreset {
  preset?: string;
  iconCaptionMaxWidth?: string | number;
  [key: string]: unknown;
}

/**
 * Placemark - маркер на карте
 */
export interface YandexPlacemark {
  getPosition(): Coordinates;
  setPosition(coordinates: Coordinates): void;
  options: {
    set(options: PlacemarkOptions): void;
    get(key: string): unknown;
  };
  properties: {
    set(key: string, value: unknown): void;
    get(key: string): unknown;
  };
  events: YandexEventManager;
}

/**
 * Объект события Yandex Maps
 */
export interface YandexEvent {
  get(key: string): unknown;
}

/**
 * Менеджер событий Yandex Maps
 */
export interface YandexEventManager {
  add(event: string, handler: (event?: YandexEvent) => void): void;
  remove(event: string, handler: () => void): void;
}

/**
 * Значение свойства маршрута
 */
export interface RoutePropertyValue {
  value?: number;
  text?: string;
}

/**
 * Свойства маршрута
 */
export interface RouteProperties {
  get(key: string): RoutePropertyValue | boolean | string | undefined;
}

/**
 * Polyline - пользовательская линия на карте
 */
export interface YandexPolyline {
  options: {
    set(options: MultiRouteOptions): void;
    get(key: string): unknown;
  };
  properties: {
    set(key: string, value: unknown): void;
    get(key: string): unknown;
  };
  events: YandexEventManager;
}

export interface YandexRouteSegment {
  properties: RouteProperties;
}

export interface YandexRouteSegmentCollection {
  each(callback: (segment: YandexRouteSegment) => void): void;
}

export interface YandexRoutePath {
  getSegments(): YandexRouteSegmentCollection | YandexRouteSegment[];
}

export interface YandexRoutePathCollection {
  each(callback: (path: YandexRoutePath) => void): void;
}

/**
 * Активный маршрут в MultiRoute
 */
export interface YandexRoute {
  properties: RouteProperties;
  getPath(): Coordinates[];
  getPaths?: () => YandexRoutePathCollection | YandexRoutePath[];
  options?: {
    set(options: MultiRouteOptions): void;
    unset?(key: string): void;
  };
}

export interface YandexRouteCollection {
  each(callback: (route: YandexRoute) => void): void;
}

/**
 * Опции для MultiRoute
 */
export interface MultiRouteOptions {
  wayPointStartIconColor?: string;
  wayPointFinishIconColor?: string;
  wayPointVisible?: boolean;
  routeActiveStrokeColor?: string;
  routeActiveStrokeWidth?: number;
  routeStrokeColor?: string;
  routeStrokeWidth?: number;
  routeStrokeOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  opacity?: number;
  [key: string]: unknown;
}

/**
 * Параметры маршрутизации
 */
export interface RoutingParams {
  routingMode: "auto" | "pedestrian" | "bicycle" | "masstransit";
  avoidTrafficJams?: boolean;
}

/**
 * Модель MultiRoute
 */
export interface MultiRouteModel {
  events: YandexEventManager;
  getRoutes(): YandexRoute[];
}

/**
 * MultiRoute - объект для расчета маршрутов
 */
export interface YandexMultiRoute {
  getActiveRoute(): YandexRoute | null;
  getRoutes?: () => YandexRouteCollection;
  setActiveRoute(route: YandexRoute | null): void;
  model: MultiRouteModel;
  options: {
    set(options: MultiRouteOptions): void;
    get(key: string): unknown;
  };
  properties: {
    set(key: string, value: unknown): void;
    get(key: string): unknown;
  };
  events: YandexEventManager;
}

/**
 * Коллекция геообъектов на карте
 */
export interface YandexGeoObjects {
  add(object: YandexPlacemark | YandexMultiRoute | YandexPolyline): void;
  remove(object: YandexPlacemark | YandexMultiRoute | YandexPolyline): void;
  removeAll(): void;
  getBounds(): Coordinates[][] | null;
}

/**
 * Опции для создания карты
 */
export interface MapOptions {
  center: Coordinates;
  zoom: number;
  controls?: string[];
  [key: string]: unknown;
}

/**
 * Опции для setBounds
 */
export interface SetBoundsOptions {
  checkZoomRange?: boolean;
  zoomMargin?: number;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Yandex Map - основная карта
 */
export interface YandexMap {
  setCenter(coordinates: Coordinates, zoom?: number, options?: { duration?: number }): void;
  setZoom(zoom: number): void;
  getZoom(): number;
  setBounds(bounds: Coordinates[][], options?: SetBoundsOptions): void;
  geoObjects: YandexGeoObjects;
  destroy(): void;
}

/**
 * Конструктор Placemark
 */
export interface PlacemarkConstructor {
  new (
    coordinates: Coordinates,
    properties: PlacemarkOptions,
    options: PlacemarkPreset
  ): YandexPlacemark;
}

/**
 * Конструктор Polyline
 */
export interface PolylineConstructor {
  new (
    coordinates: Coordinates[],
    properties?: Record<string, unknown>,
    options?: MultiRouteOptions
  ): YandexPolyline;
}

/**
 * Параметры для создания MultiRoute
 */
export interface MultiRouteParams {
  referencePoints: Coordinates[];
  params: RoutingParams;
}

/**
 * Конструктор MultiRoute
 */
export interface MultiRouteConstructor {
  new (
    params: MultiRouteParams,
    options: MultiRouteOptions
  ): YandexMultiRoute;
}

/**
 * Модуль multiRouter
 */
export interface MultiRouterModule {
  MultiRoute: MultiRouteConstructor;
}

/**
 * Глобальный объект ymaps
 */
export interface YandexMapsNamespace {
  Map: new (container: HTMLElement | string, state: MapOptions) => YandexMap;
  Placemark: PlacemarkConstructor;
  Polyline: PolylineConstructor;
  multiRouter: MultiRouterModule;
  ready(callback: () => void): void;
}

/**
 * Расширение Window для глобального объекта ymaps
 */
declare global {
  interface Window {
    ymaps?: YandexMapsNamespace;
  }
}
