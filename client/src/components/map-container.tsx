import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Crosshair } from "lucide-react";
import type { AddressPoint, RouteOption } from "@/store/route-slice";

interface MapContainerProps {
  isLoaded: boolean;
  routes: RouteOption[];
  selectedRouteId: string | null;
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
}

export function MapContainer({ 
  isLoaded, 
  routes, 
  selectedRouteId, 
  startingPoint, 
  destinations 
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const yandexMapRef = useRef<any>(null);
  const { isCalculating } = useSelector((state: RootState) => state.route);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Initialize Yandex Map
    const initMap = () => {
      // @ts-ignore - Yandex Maps API
      yandexMapRef.current = new ymaps.Map(mapRef.current, {
        center: [55.76, 37.64], // Moscow center
        zoom: 10,
        controls: []
      });
    };

    // @ts-ignore - Yandex Maps API
    if (window.ymaps) {
      // @ts-ignore
      ymaps.ready(initMap);
    }

    return () => {
      if (yandexMapRef.current) {
        yandexMapRef.current.destroy();
      }
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!yandexMapRef.current || !startingPoint) return;

    // Clear existing objects
    yandexMapRef.current.geoObjects.removeAll();
    console.log("new start:", startingPoint)
    // Add starting point marker
    // @ts-ignore
    const startMarker = new ymaps.Placemark(
      startingPoint.coordinates,
      { 
        balloonContent: `<strong>Starting Point</strong><br/>${startingPoint.address}`,
        iconCaption: 'Start'
      },
      {
        preset: 'islands#greenCircleDotIconWithCaption',
        iconCaptionMaxWidth: '200'
      }
    );
    
    yandexMapRef.current.geoObjects.add(startMarker);
    // Center map on new starting point
    yandexMapRef.current.setCenter(startingPoint.coordinates, 12, { duration: 300 });

    // Add destination markers
    destinations.forEach((destination, index) => {
      if (destination.coordinates[0] !== 0 || destination.coordinates[1] !== 0) {
        // @ts-ignore
        const destMarker = new ymaps.Placemark(
          destination.coordinates,
          { 
            balloonContent: `<strong>Destination ${index + 1}</strong><br/>${destination.address}`,
            iconCaption: (index + 1).toString()
          },
          {
            preset: 'islands#redCircleDotIconWithCaption',
            iconCaptionMaxWidth: '200'
          }
        );
        
        yandexMapRef.current.geoObjects.add(destMarker);
      }
    });

    // Fit map to show all markers
    if (destinations.length > 0) {
      const bounds = [startingPoint.coordinates];
      destinations.forEach(dest => {
        if (dest.coordinates[0] !== 0 || dest.coordinates[1] !== 0) {
          bounds.push(dest.coordinates);
        }
      });
      
      if (bounds.length > 1) {
        yandexMapRef.current.setBounds(
          yandexMapRef.current.geoObjects.getBounds(),
          { checkZoomRange: true, zoomMargin: 50 }
        );
      }
    }
  }, [startingPoint, destinations]);

  useEffect(() => {
    if (!yandexMapRef.current || routes.length === 0) return;

    // Remove existing routes
    yandexMapRef.current.geoObjects.each((obj: any) => {
      if (obj.geometry && obj.geometry.getType() === 'LineString') {
        yandexMapRef.current.geoObjects.remove(obj);
      }
    });

    // Add route polylines
    routes.forEach((route, index) => {
      if (route.geometry) {
        const isSelected = route.id === selectedRouteId;
        const isFastest = routes.reduce((fastest, current) => 
          current.duration < fastest.duration ? current : fastest
        ).id === route.id;

        let strokeColor = '#0066CC'; // Default blue
        let strokeWidth = 3;
        let strokeOpacity = 0.7;

        if (isFastest) {
          strokeColor = '#22C55E'; // Green for fastest
          strokeWidth = 4;
          strokeOpacity = 0.9;
        } else if (isSelected) {
          strokeWidth = 4;
          strokeOpacity = 0.9;
        }

        // @ts-ignore
        const polyline = new ymaps.Polyline(
          route.geometry.coordinates || [],
          { 
            balloonContent: `Route ${index + 1}: ${Math.round(route.duration / 60)}min, ${(route.distance / 1000).toFixed(1)}km`
          },
          {
            strokeColor,
            strokeWidth,
            strokeOpacity
          }
        );

        yandexMapRef.current.geoObjects.add(polyline);
      }
    });
  }, [routes, selectedRouteId]);

  const handleZoomIn = () => {
    if (yandexMapRef.current) {
      yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (yandexMapRef.current) {
      yandexMapRef.current.setZoom(yandexMapRef.current.getZoom() - 1);
    }
  };

  const handleCenter = () => {
    if (yandexMapRef.current && startingPoint) {
      yandexMapRef.current.setCenter(startingPoint.coordinates);
    }
  };

  const routeColors = [
    { color: 'bg-green-500', label: 'Fastest Route' },
    { color: 'bg-blue-500', label: 'Alternative' },
    { color: 'bg-purple-500', label: 'Via Highway' },
  ];

  return (
    <div className="flex-1 relative">
      <div 
        ref={mapRef}
        className="w-full h-full bg-muted"
        style={{ minHeight: '100%' }}
      />

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

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          className="bg-background border shadow-lg"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          className="bg-background border shadow-lg"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCenter}
          className="bg-background border shadow-lg"
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>

      {/* Route Legend */}
      {routes.length > 0 && (
        <Card className="absolute bottom-4 left-4 shadow-lg">
          <CardContent className="p-4">
            <h5 className="font-semibold text-foreground mb-3">Route Legend</h5>
            <div className="space-y-2 text-sm">
              {routes.slice(0, 3).map((route, index) => {
                const isFastest = routes.reduce((fastest, current) => 
                  current.duration < fastest.duration ? current : fastest
                ).id === route.id;
                
                return (
                  <div key={route.id} className="flex items-center">
                    <div className={`w-4 h-1 ${isFastest ? 'bg-green-500' : routeColors[index]?.color || 'bg-blue-500'} rounded mr-3`}></div>
                    <span className="text-muted-foreground">
                      {isFastest ? 'Fastest' : routeColors[index]?.label || 'Alternative'} ({Math.round(route.duration / 60)}m)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
