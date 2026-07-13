import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function vibrate(pattern: number | number[] = 50) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export async function nativeShare(title: string, text: string, url: string) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (err) {
      console.log('Share failed:', err);
      return false;
    }
  }
  return false;
}

export function setAppBadge(count: number) {
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count).catch(console.error);
    } else if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(console.error);
    }
  }
}
