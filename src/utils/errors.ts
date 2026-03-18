/**
 * Extract a safe error message from an unknown thrown value.
 * Using this utility allows route handlers to use `catch (err: unknown)`
 * instead of the less-safe `catch (err: any)`.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
