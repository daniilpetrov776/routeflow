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
      layout
      layoutId={motionKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        opacity: { duration: 0.16, ease: "easeOut" },
        y: { duration: 0.2, ease: "easeOut" },
        layout: { type: "spring", stiffness: 420, damping: 36 },
      }}
      className={styles.cardMotion}
    >
      {children}
    </motion.div>
  );
}

export { styles as routeCardMotionStyles };
