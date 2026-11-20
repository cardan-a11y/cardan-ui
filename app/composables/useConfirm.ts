import type { ShallowRef } from 'vue';

export interface ConfirmRequest {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

interface ConfirmState {
  request: ShallowRef<ConfirmRequest | null>;
  open: ((request: ConfirmRequest) => void) | null;
}

// Per app, not useState: a request holds functions, which no payload carries
const states = new WeakMap<object, ConfirmState>();

function confirmState(): ConfirmState {
  const nuxtApp = useNuxtApp();
  let state = states.get(nuxtApp);

  if (!state) {
    state = { request: shallowRef(null), open: null };
    states.set(nuxtApp, state);
  }

  return state;
}

function warn(message: string) {
  if (import.meta.dev || import.meta.test)
    console.warn(`[cardan-ui] ${message}`);
}

/**
 * Asks before an action, in the ConfirmDialog of ConfirmDialogHost (mounted
 * once, in the layout). The action travels with the request: `onConfirm`
 * closes over its item, and nothing shared outlives the dialog.
 *
 * `confirm()` resolves `true` once the action succeeded and the dialog has
 * closed, `false` after a cancel. A throw stays in the dialog, shown with
 * `extractApiError()`, to try again or cancel. While a request is open,
 * another `confirm()` resolves `false` at once, as it does without a host.
 */
export function useConfirm() {
  const state = confirmState();

  function confirm(options: ConfirmOptions): Promise<boolean> {
    if (!state.open) {
      warn('confirm() needs a mounted <ConfirmDialogHost />');
      return Promise.resolve(false);
    }

    if (state.request.value) {
      warn('confirm() while another confirmation is open');
      return Promise.resolve(false);
    }

    const open = state.open;

    return new Promise<boolean>((resolve) => {
      const request = { options, resolve };
      state.request.value = request;
      open(request);
    });
  }

  return { confirm };
}

/** For ConfirmDialogHost only: the open request, and the host's side of it */
export function useConfirmHost() {
  const state = confirmState();

  /** Takes the requests; returns the release, or nothing for a second host */
  function register(open: (request: ConfirmRequest) => void) {
    if (state.open) {
      warn('<ConfirmDialogHost /> is mounted twice; the second does nothing');
      return undefined;
    }

    state.open = open;

    return () => {
      state.open = null;
      if (state.request.value) finish(state.request.value, false);
    };
  }

  /** Clears the request if it is still the open one, then resolves it */
  function finish(request: ConfirmRequest, confirmed: boolean) {
    if (state.request.value !== request) return;
    state.request.value = null;
    request.resolve(confirmed);
  }

  return { request: computed(() => state.request.value), register, finish };
}
