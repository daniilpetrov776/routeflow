import styles from "./map-container.module.css";

/**
 * Компонент состояния загрузки карты
 */
export function MapLoadingState() {
  return (
    <div className={styles["map-container__loading"]}>
      <div className={styles["map-container__loading-content"]}>
        <div className={styles["map-container__loading-icon"]}>🗺️</div>
        <h3 className={styles["map-container__loading-title"]}>Interactive Map</h3>
        <p className={styles["map-container__loading-description"]}>
          Map will display here once routes are calculated
        </p>
        <div className={styles["map-container__loading-legend"]}>
          <div
            className={`${styles["map-container__loading-legend-dot"]} ${styles["map-container__loading-legend-dot--green"]}`}
          ></div>
          <span className={styles["map-container__loading-legend-label"]}>
            Starting Point
          </span>
          <div className={styles["map-container__loading-legend-spacer"]}></div>
          <div
            className={`${styles["map-container__loading-legend-dot"]} ${styles["map-container__loading-legend-dot--red"]}`}
          ></div>
          <span className={styles["map-container__loading-legend-label"]}>
            Destinations
          </span>
        </div>
      </div>
    </div>
  );
}

