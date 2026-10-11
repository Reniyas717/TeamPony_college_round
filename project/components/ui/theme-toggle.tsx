"use client";

import * as React from "react";
import { Moon, Sun1 } from "iconsax-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("nexus-theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    }
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("nexus-theme", nextTheme);
    
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) {
    return <Button variant="ghost" size="icon" className={`w-10 h-10 ${className}`} aria-hidden="true" />;
  }

  return (
    <Button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      variant="ghost"
      size="icon"
      className={`w-10 h-10 relative overflow-hidden ${className || ""}`}
    >
      <span className="relative flex items-center justify-center w-5 h-5">
        <Moon
          size="20"
          variant="Bold"
          className={`absolute inset-0 will-change-[opacity,transform,filter] transition-[opacity,transform,filter] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)] ${
            theme === "light"
              ? "opacity-100 scale-100 blur-0"
              : "opacity-0 scale-[0.25] blur-[4px]"
          }`}
          aria-hidden={theme !== "light"}
        />
        <Sun1
          size="20"
          variant="Bold"
          className={`absolute inset-0 will-change-[opacity,transform,filter] transition-[opacity,transform,filter] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)] ${
            theme === "dark"
              ? "opacity-100 scale-100 blur-0"
              : "opacity-0 scale-[0.25] blur-[4px]"
          }`}
          aria-hidden={theme !== "dark"}
        />
      </span>
    </Button>
  );
}
