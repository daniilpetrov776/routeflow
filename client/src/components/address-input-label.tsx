import styles from "./address-input.module.css";

interface AddressInputLabelProps {
  label?: string;
  icon?: string;
}

/**
 * Лейбл для поля ввода адреса с иконкой
 */
export function AddressInputLabel({ label, icon }: AddressInputLabelProps) {
  if (!label) return null;

  return (
    <label className={styles["address-input__label"]}>
      {icon && <span className={styles["address-input__label-icon"]}>{icon}</span>}
      {label}
    </label>
  );
}

