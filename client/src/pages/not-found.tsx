import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles["not-found"]}>
      <Card className={styles["not-found__card"]}>
        <CardContent className={styles["not-found__content"]}>
          <div className={styles["not-found__header"]}>
            <AlertCircle className={styles["not-found__icon"]} />
            <h1 className={styles["not-found__title"]}>404 Страница не найдена</h1>
          </div>

          <p className={styles["not-found__description"]}>
            Забыли добавить страницу в роутер?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
