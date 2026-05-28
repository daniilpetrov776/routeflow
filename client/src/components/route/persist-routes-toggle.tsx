import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setPersistRoutes } from "@/store/route-slice";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import styles from "./route-sidebar.module.css";

/**
 * Переключатель для сохранения маршрутов между перезагрузками
 */
export function PersistRoutesToggle() {
  const dispatch = useDispatch();
  const persistRoutes = useSelector((state: RootState) => state.route.persistRoutes);

  const handleToggle = (checked: boolean) => {
    dispatch(setPersistRoutes(checked));
  };

  return (
    <div className={styles["route-sidebar__persist-toggle"]}>
      <Label
        htmlFor="persist-routes"
        className={styles["route-sidebar__persist-label"]}
      >
        <Save className={styles["route-sidebar__persist-icon"]} />
        <span>Сохранять маршруты</span>
      </Label>
      <Switch
        id="persist-routes"
        checked={persistRoutes}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}






