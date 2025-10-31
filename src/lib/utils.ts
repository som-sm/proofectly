import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0

  return function (...args: Parameters<T>): void {
    const now = Date.now()
    if (now - lastCallTime >= delay) {
      lastCallTime = now
      func(...args)
    }
  }
}
