/**
 * Version Plugin
 * 
 * Provides the application version from package.json at build time.
 * Makes it available via useAppVersion() composable and $version property.
 */

export const useAppVersion = () => {
  // @ts-ignore - version is injected at build time
  return useRuntimeConfig().public.appVersion || '0.0.0-unknown';
};

export default defineNuxtPlugin(() => {
  // @ts-ignore - version is injected at build time
  const version = useRuntimeConfig().public.appVersion || '0.0.0-unknown';
  
  return {
    provide: {
      version
    }
  };
});
