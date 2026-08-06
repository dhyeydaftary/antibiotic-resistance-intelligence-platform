import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges conditional classNames (clsx) and resolves conflicting Tailwind
// utility classes (twMerge) — standard shadcn/ui className helper, used
// throughout components/ui and components/app.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
