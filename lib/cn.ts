import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Used by every component per component-builder/SKILL.md's template —
// merges conditional class lists and resolves conflicting Tailwind
// utilities (the last one wins) rather than concatenating duplicates.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
