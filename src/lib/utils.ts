import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Une clases de Tailwind resolviendo conflictos (la ultima gana).
 * Uso: cn("px-3 text-muted", isActive && "text-ink")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
