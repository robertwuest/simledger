/**
 * Resolve URLs of files in `public/` against the configured app base URL,
 * so assets keep working when the app is deployed to a sub path (e.g. GitHub Pages).
 */
export function useAssetUrl() {
  const base = useRuntimeConfig().app.baseURL || '/';
  return (path: string) => `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
