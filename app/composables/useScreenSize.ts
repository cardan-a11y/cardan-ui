import { createSharedComposable, useMediaQuery } from '@vueuse/core';

/**
 * The breakpoints and the pointer type as refs, shared by every caller. They
 * are made in a component's scope on first use and disposed when no component
 * uses them, instead of living from module load for the life of the page.
 */
export const useScreenSize = createSharedComposable(() => {
  const iPhoneScreen = useMediaQuery(
    'only screen and (min-device-width: 320px) and (max-device-width: 667px)',
  );

  const isCoarsePointer = useMediaQuery('(pointer: coarse)');
  const isExtraSmallScreen = useMediaQuery('(min-width: 360px)');
  const isSmallScreen = useMediaQuery('(min-width: 480px)');
  const isMediumScreen = useMediaQuery('(min-width: 768px)');
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const isExtraLargeScreen = useMediaQuery('(min-width: 1280px)');

  return {
    iPhoneScreen,
    isCoarsePointer,
    isExtraSmallScreen,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isExtraLargeScreen,
  };
});
