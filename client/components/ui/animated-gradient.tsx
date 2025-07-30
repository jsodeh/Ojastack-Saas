import { cn } from "@/lib/utils";

interface AnimatedGradientProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGradient({ children, className }: AnimatedGradientProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg",
      "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/20 before:via-blue-500/20 before:to-purple-500/20",
      "before:animate-gradient-x before:bg-[length:200%_200%]",
      className
    )}>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}