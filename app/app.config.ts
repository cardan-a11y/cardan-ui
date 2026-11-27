import type { CardanConfig } from './types';

// Empty: app config joins arrays, so a default host would be in every project's list
const cardan: CardanConfig = {
  markdownImageHosts: [],
};

export default defineAppConfig({ cardan });
