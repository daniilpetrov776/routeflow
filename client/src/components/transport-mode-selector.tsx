import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setTransportMode, clearRoutes } from "@/store/route-slice";
import { Button } from "@/components/ui/button";
import { Footprints, Bike, Bus, Car } from "lucide-react";
import type { TransportMode } from "@/store/route-slice";

const transportModes: Array<{
  mode: TransportMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: 'walking', label: 'Пешком', icon: Footprints },
  { mode: 'cycling', label: 'Велосипед', icon: Bike },
  { mode: 'transit', label: 'Общественный транспорт', icon: Bus },
  { mode: 'driving', label: 'Автомобиль', icon: Car },
];

export function TransportModeSelector() {
  const dispatch = useDispatch();
  const { transportMode } = useSelector((state: RootState) => state.route);

  const handleModeChange = (mode: TransportMode) => {
    dispatch(setTransportMode(mode));
    dispatch(clearRoutes());
  };

  return (
    <div className="grid grid-cols-4 gap-1 bg-muted rounded-lg p-1">
      {transportModes.map(({ mode, label, icon: Icon }) => (
        <Button
          key={mode}
          variant={transportMode === mode ? "default" : "ghost"}
          size="sm"
          onClick={() => handleModeChange(mode)}
          className={`
            transport-mode-button min-w-0 px-2
            ${transportMode === mode 
              ? 'transport-mode-button-active' 
              : 'transport-mode-button-inactive'
            }
          `}
        >
          <Icon className="h-4 w-4 mr-1" />
          <span className="text-xs truncate">{label}</span>
        </Button>
      ))}
    </div>
  );
}
