import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

export function RouteResults() {

  const { routes } = useSelector((state: RootState) => state.route);

  if (routes.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-3">Route Options</h3>
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-2">🗺️</div>
          <p>Calculate routes to see options here</p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getTrafficColor = (level: string) => {
    switch (level) {
      case 'light': return 'text-green-600 dark:text-green-400';
      case 'moderate': return 'text-yellow-600 dark:text-yellow-400';
      case 'heavy': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const fastestRoute = routes.reduce((fastest, current) => 
    current.duration < fastest.duration ? current : fastest
  );

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-lg font-semibold text-foreground mb-3">Route Options</h3>
      
      {routes.map((route, index) => {
        const isFastest = route.id === fastestRoute.id;
        
        return (
          <Card
            key={route.id}
            className={`
              route-card 
              ${isFastest ? 'route-card-fastest' : ''}
            `}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {isFastest && (
                    <Badge variant="secondary" className="bg-green-500 text-white mr-2">
                      FASTEST
                    </Badge>
                  )}
                  <span className="font-semibold text-foreground">
                    Route {index + 1}
                  </span>
                </div>
                {isFastest && <Crown className="h-4 w-4 text-yellow-500" />}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <div className="font-semibold text-foreground">
                    {formatDuration(route.duration)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Distance:</span>
                  <div className="font-semibold text-foreground">
                    {formatDistance(route.distance)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Traffic:</span>
                  <div className={`font-semibold capitalize ${getTrafficColor(route.traffic_info.level)}`}>
                    {route.traffic_info.level}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Destination:</span>
                  <div className="font-semibold text-foreground text-xs">
                    {route.destination.address.length > 20 ? route.destination.address.substring(0, 20) + '...' : route.destination.address}
                  </div>
                </div>
              </div>
              

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
