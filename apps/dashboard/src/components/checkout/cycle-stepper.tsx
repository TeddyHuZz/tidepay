"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

interface CycleStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function CycleStepper({
  value,
  onChange,
  min = 1,
  max = 100,
  disabled = false,
}: CycleStepperProps) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(null);
  }, [value]);

  return (
    <div className="flex items-center rounded-lg border border-border bg-background p-1 shadow-xs">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => {
          const next = Math.max(min, value - 1);
          setText(null);
          onChange(next);
        }}
        className="size-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer"
        aria-label="Decrease cycles"
      >
        <Minus className="size-3.5" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={text !== null ? text : value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          setText(raw);
          const num = parseInt(raw, 10);
          if (!isNaN(num)) {
            onChange(Math.min(max, Math.max(min, num)));
          }
        }}
        onBlur={() => {
          if (text !== null) {
            const num = parseInt(text, 10);
            if (isNaN(num) || num < min) {
              onChange(min);
            } else if (num > max) {
              onChange(max);
            }
            setText(null);
          }
        }}
        className="w-12 text-center font-bold text-sm tabular-nums bg-transparent text-foreground border-none focus:outline-none focus:ring-1 focus:ring-primary rounded py-0.5"
      />

      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => {
          const next = Math.min(max, value + 1);
          setText(null);
          onChange(next);
        }}
        className="size-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer"
        aria-label="Increase cycles"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
