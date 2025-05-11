import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge multiple class names with tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
