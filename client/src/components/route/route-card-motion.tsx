import { motion } from "framer-motion";
import styles from "./route-card-motion.module.css";

export function RouteCardMotion({
  motionKey,
  children,
}: {
  motionKey: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key={motionKey}
      layout
      transition={{ duration: 0.24, ease: "easeOut" }}
      className={styles.cardMotion}
    >
      {children}
    </motion.div>
  );
}

export { styles as routeCardMotionStyles };