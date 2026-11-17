type ClassValue = string | number | false | null | undefined;

/** Penggabung nama kelas tanpa dependensi eksternal. */
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}
