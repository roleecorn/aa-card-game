export function resolvePublicAssetPath(path: string | undefined, baseUrl = import.meta.env.BASE_URL): string | undefined {
  if (!path) return path;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path;

  const normalizedBase = (baseUrl || '/').endsWith('/') ? (baseUrl || '/') : `${baseUrl}/`;
  if (path.startsWith(normalizedBase)) return path;

  return `${normalizedBase}${path.replace(/^\/+/, '')}`;
}
