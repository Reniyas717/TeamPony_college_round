"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sun1, Moon } from "iconsax-react";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");

  React.useEffect(() => {
    // Check if user has explicitly stored a preference; default to dark
    const savedTheme = localStorage.getItem("nexus-theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      requestAnimationFrame(() => {
        setTheme("light");
      });
    } else {
      document.documentElement.classList.add("dark");
      requestAnimationFrame(() => {
        setTheme("dark");
      });
    }
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

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="relative overflow-hidden w-10 h-10 rounded-full"
      aria-label="Toggle theme"
    >
      <Sun1 
        size="22" 
        className={`absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          theme === "dark" ? "translate-y-8 opacity-0 rotate-90 scale-50" : "translate-y-0 opacity-100 rotate-0 scale-100"
        }`} 
      />
      <Moon 
        size="22" 
        className={`absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          theme === "light" ? "-translate-y-8 opacity-0 -rotate-90 scale-50" : "translate-y-0 opacity-100 rotate-0 scale-100"
        }`} 
      />
    </Button>
  );
}
