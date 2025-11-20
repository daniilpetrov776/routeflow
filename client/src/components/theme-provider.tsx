import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { actualTheme } = useSelector((state: RootState) => state.theme);

  // Применяем тему к документу
  useEffect(() => {
    const root = document.documentElement;
    
    if (actualTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [actualTheme]);

  return <>{children}</>;
}
