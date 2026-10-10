"use client";

import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function ParallaxBot() {
  const { scrollYProgress } = useScroll();
  
  // Animate the bot down the page, rotating and scaling
  const y = useTransform(scrollYProgress, [0, 1], [0, 800]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 1], [1, 1.5, 0.8]);
  const opacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.8, 0]);

  return (
    <motion.div
      className="fixed pointer-events-none z-0 right-[5%] lg:right-[15%] top-[15%] hidden md:flex items-center justify-center w-64 h-64"
      style={{ y, rotate, scale, opacity }}
    >
      {/* Glowing aura */}
      <div className="absolute inset-0 bg-brand/30 rounded-full blur-[60px]" />
      
      {/* Prominent Tech/AI Core SVG */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-brand relative z-10 drop-shadow-[0_0_15px_rgba(var(--brand-rgb),0.5)]"
      >
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="3" strokeDasharray="15 15" className="animate-spin origin-center" style={{ animationDuration: '12s' }} />
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" />
        <rect x="65" y="65" width="70" height="70" rx="16" stroke="currentColor" strokeWidth="4" fill="var(--background)" />
        {/* Eyes/Sensors */}
        <circle cx="85" cy="85" r="8" fill="currentColor" className="animate-pulse" />
        <circle cx="115" cy="85" r="8" fill="currentColor" className="animate-pulse" />
        {/* Smile/Waveform */}
        <path d="M 80 115 Q 100 130 120 115" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        
        {/* Inner circuits */}
        <path d="M 100 65 L 100 40" stroke="currentColor" strokeWidth="2" />
        <path d="M 100 160 L 100 135" stroke="currentColor" strokeWidth="2" />
        <path d="M 65 100 L 40 100" stroke="currentColor" strokeWidth="2" />
        <path d="M 160 100 L 135 100" stroke="currentColor" strokeWidth="2" />
      </svg>
    </motion.div>
  );
}
