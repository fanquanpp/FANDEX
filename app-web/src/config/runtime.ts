
function envString(key: string, fallback: string): string {
  const value = import.meta.env[key] as string | undefined;
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export const RUNTIME = {
  siteUrl: envString('PUBLIC_SITE_URL', 'https://fanquanpp.github.io/FANDEX'),
} as const;

export type RuntimeConfig = typeof RUNTIME;
