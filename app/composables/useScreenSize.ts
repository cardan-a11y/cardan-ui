import { createSharedComposable, useMediaQuery } from '@vueuse/core';

/** The breakpoints and the pointer type as refs, shared by every caller. */
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
