import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setTheme } from "@/store/theme-slice";
import { addDestination, setTransportMode, setCalculating, setError, setRoutes } from "@/store/route-slice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddressInput } from "./address-input";
import { TransportModeSelector } from "./transport-mode-selector";
import { RouteResults } from "./route-results";
import { Sun, Moon, Monitor, Plus, Route, Crown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AddressPoint, RouteOption } from "@/store/route-slice";

export function RouteSidebar() {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { 
    startingPoint, 
    destinations, 
    transportMode, 
    routes, 
    isCalculating,
    error 
  } = useSelector((state: RootState) => state.route);
  const { theme } = useSelector((state: RootState) => state.theme);

  const handleThemeToggle = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    dispatch(setTheme(nextTheme));
  };

  const handleAddDestination = () => {
    dispatch(addDestination({
      address: '',
      coordinates: [55.7558, 37.6176] // Moscow center - won't trigger map camera jump until geocoded
    }));
  };

  // Helper function to geocode addresses
  const geocodeIfNeeded = async (addressPoint: AddressPoint): Promise<AddressPoint> => {
    if (addressPoint.coordinates[0] !== 0 || addressPoint.coordinates[1] !== 0) {
      return addressPoint; // Already has coordinates
    }

    try {
      const response = await apiRequest('GET', `/api/geocode?address=${encodeURIComponent(addressPoint.address)}`);
      const data = await response.json();
      
      if (data.response?.GeoObjectCollection?.featureMember?.[0]) {
        const geoObject = data.response.GeoObjectCollection.featureMember[0].GeoObject;
        const coords = geoObject.Point.pos.split(' ').map(Number);
        return {
          ...addressPoint,
          coordinates: coords as [number, number]
          // coordinates: [coords[1], coords[0]],
        };
      }
    } catch (error) {
      console.warn('Geocoding failed for:', addressPoint.address);
    }

    // Return with default Moscow coordinates if geocoding fails
    return {
      ...addressPoint,
      coordinates: [55.7558, 37.6176] // Moscow center
    };
  };

  const handleCalculateRoutes = async () => {
    if (!startingPoint || destinations.length === 0) {
      toast({
        title: "Недостаточно данных",
        description: "Добавьте начальную точку и хотя бы один пункт назначения",
        variant: "destructive",
      });
      return;
    }

    // Calculation is now handled automatically by MapContainer component
    // using Yandex Maps client-side routing API
    toast({
      title: "Расчет маршрутов",
      description: "Маршруты рассчитываются автоматически на карте с помощью Yandex Maps API",
    });
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="h-4 w-4" />;
      case 'dark': return <Moon className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-96 bg-card border-r border-border flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-foreground">Route Planner</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            className="h-9 w-9"
          >
            {getThemeIcon()}
          </Button>
        </div>
        
        <TransportModeSelector />
      </div>

      {/* Address Inputs */}
      <div className="p-4 space-y-4">
        <AddressInput
          label="Starting Point"
          icon="📍"
          value={startingPoint?.address || ''}
          placeholder="Enter starting address..."
          type="start"
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-muted-foreground">
              🏁 Destinations
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddDestination}
              className="text-primary hover:text-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          
          {destinations.map((destination, index) => (
            <div key={index} className="mb-3">
              <AddressInput
                value={destination.address}
                placeholder="Enter destination address..."
                type="destination"
                index={index}
              />
            </div>
          ))}
        </div>

        <Button
          onClick={handleCalculateRoutes}
          disabled={isCalculating || !startingPoint || !startingPoint.address || destinations.length === 0 || destinations.some(d => !d.address)}
          className="w-full"
        >
          <Route className="h-4 w-4 mr-2" />
          {isCalculating ? 'Calculating...' : 'Calculate Routes'}
        </Button>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Route Results */}
      <div className="flex-1 overflow-y-auto">
        <RouteResults />
      </div>

      {/* Summary Statistics */}
      {routes.length > 0 && (
        <div className="border-t border-border p-4 bg-muted/50">
          <h4 className="font-semibold text-foreground mb-3">Summary Statistics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{routes.length}</div>
              <div className="text-muted-foreground">Routes Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {Math.min(...routes.map(r => Math.round(r.duration / 60)))}m
              </div>
              <div className="text-muted-foreground">Best Time</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
