import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | string | null | undefined): string {
  if (price == null) return '-'
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return `₩${numPrice.toLocaleString('ko-KR')}`
}
