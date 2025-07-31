import React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  max: number;
  step: number;
  className?: string;
}

export function Slider({ value, onValueChange, max, step, className }: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseInt(e.target.value)]);
  };

  return (
    <input
      type="range"
      min={0}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={cn(
        'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer',
        'slider:bg-blue-600 slider:rounded-lg',
        className
      )}
    />
  );
}