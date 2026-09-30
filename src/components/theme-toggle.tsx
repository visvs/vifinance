"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // El tema real sólo se conoce en el navegador: pintar el icono antes de
  // montar causaría un desajuste de hidratación.
  useEffect(() => setMounted(true), []);

  const isDark = theme !== "light";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && !isDark ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  );
}
