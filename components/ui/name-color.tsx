import { stringToColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NameColorProps {
  name: string;
  className?: string;
}

export function NameColor({ name, className }: NameColorProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: stringToColor(name) }}
    />
  );
}
