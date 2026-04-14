import { useEffect, useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className={className} aria-label="Toggle theme mode">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const currentTheme = theme ?? "system";

  const nextTheme =
    currentTheme === "system"
      ? "light"
      : currentTheme === "light"
        ? "dark"
        : "system";

  const label =
    currentTheme === "system"
      ? "Theme: system (click for light)"
      : currentTheme === "light"
        ? "Theme: light (click for dark)"
        : "Theme: dark (click for system)";

  return (
    <Button
      variant="outline"
      size="icon"
      className={className}
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      {currentTheme === "system" ? (
        <Laptop className="h-4 w-4" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
