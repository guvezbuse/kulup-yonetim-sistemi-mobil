// Hata nesneleri TypeScript'te "unknown" gelir; tek yerden güvenli biçimde okuyoruz.
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const getErrorCode = (error: unknown): string | undefined => {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
};
