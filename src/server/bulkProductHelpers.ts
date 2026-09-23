export function isForeignKeyViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23503');
}

export function titleCase(id: string): string {
  return id.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
