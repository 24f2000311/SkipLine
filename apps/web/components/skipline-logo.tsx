"use client";

import Image from "next/image";

interface SkiplineLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

/**
 * Skipline official logo — uses the transparent PNG from /public.
 */
export function SkiplineLogo({ size = "md", showTagline = false, className = "" }: SkiplineLogoProps) {
  const sizes = {
    sm: { width: 140, height: 56 },
    md: { width: 200, height: 80 },
    lg: { width: 280, height: 112 },
  };

  const s = sizes[size];

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <Image
        src="/Logo.svg"
        alt="Skipline"
        width={s.width}
        height={s.height}
        priority
        style={{ width: s.width, height: "auto" }}
      />
      {showTagline && (
        <p className="text-[10px] sm:text-xs font-semibold text-sl-muted tracking-[0.18em] uppercase mt-1">
          Join the queue. Not the crowd.
        </p>
      )}
    </div>
  );
}
