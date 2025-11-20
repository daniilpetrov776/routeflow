import styles from "./map-container.module.css";

/**
 * Компонент состояния расчета маршрутов
 */
export function MapCalculatingState() {
  return (
    <div className={styles["map-container__calculating"]}>
      <div className={styles["map-container__calculating-content"]}>
        <div className={styles["map-container__calculating-spinner"]}></div>
        <p className={styles["map-container__calculating-text"]}>
          Calculating routes...
        </p>
      </div>
    </div>
  );
}

