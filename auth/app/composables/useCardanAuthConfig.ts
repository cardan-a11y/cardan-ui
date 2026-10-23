/**
 * The layer's settings: the `cardanAuth` block of the app config, see
 * `CardanAuthConfig` and the defaults in `app/app.config.ts`.
 */
export function useCardanAuthConfig(): CardanAuthConfig {
  return useAppConfig().cardanAuth as CardanAuthConfig;
}
