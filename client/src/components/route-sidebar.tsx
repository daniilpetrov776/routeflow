import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setTheme } from "@/store/theme-slice";
import { addDestination, } from "@/store/route-slice";
import { Button } from "@/components/ui/button";
import { AddressInput } from "./address-input";
import { TransportModeSelector } from "./transport-mode-selector";
import { RouteResults } from "./route-results";
import { Sun, Moon, Monitor, Plus, } from "lucide-react";

export function RouteSidebar() {
  const dispatch = useDispatch();
  const { 
    startingPoint, 
    destinations, 
    routes,
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
          <h1 className="text-xl font-semibold text-foreground">Планировщик маршрутов</h1>
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
          label="Начальная точка"
          icon="📍"
          value={startingPoint?.address || ''}
          placeholder="Введите начальный адрес..."
          type="start"
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-muted-foreground">
              🏁 Пункты назначения
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddDestination}
              className="text-primary hover:text-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </div>
          
          {destinations.map((destination, index) => (
            <div key={index} className="mb-3">
              <AddressInput
                value={destination.address}
                placeholder="Введите адрес назначения..."
                type="destination"
                index={index}
              />
            </div>
          ))}
        </div>

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
          <h4 className="font-semibold text-foreground mb-3">Сводная статистика</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{routes.length}</div>
              <div className="text-muted-foreground">Найдено маршрутов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {Math.min(...routes.map(r => Math.round(r.duration / 60)))}м
              </div>
              <div className="text-muted-foreground">Лучшее время</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
