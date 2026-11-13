import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { nextTick } from 'vue';
import { CookiesButton, CookiesDialog } from '#components';
import { useCookiesDialog, useRuntimeConfig } from '#imports';
import { accessibleName, checkA11y, description } from '../a11y';

/**
 * The consent dialog, the button that opens it and the state they share.
 * GTM is the module's business: its composables are stubbed, and nothing
 * here checks what reaches the data layer, only whether GTM is asked for.
 */
const { consentTrigger, useGtm } = vi.hoisted(() => {
  const gtm = { proxy: { dataLayer: { push: () => {} } }, remove: () => {} };
  return {
    consentTrigger: Object.assign(Promise.resolve(), { accept: vi.fn() }),
    useGtm: vi.fn(() => gtm),
  };
});

mockNuxtImport('useScriptGoogleTagManager', () => useGtm);
mockNuxtImport('useScriptTriggerConsent', () => () => consentTrigger);

type Consent = { necessary: boolean; analytics: boolean; marketing: boolean };

/** The cookie as the browser keeps it from an earlier visit */
function setConsentCookie(consent: Consent) {
  document.cookie = `cookieConsent=${encodeURIComponent(JSON.stringify(consent))}; path=/`;
}

/** The consent in the cookie, or undefined without one */
function consentCookie(): Consent | undefined {
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('cookieConsent='))
    ?.slice('cookieConsent='.length);
  return value ? JSON.parse(decodeURIComponent(value)) : undefined;
}

async function mountDialog() {
  const wrapper = await mountSuspended(CookiesDialog, {
    attachTo: document.body,
  });
  const dialog = wrapper.get('dialog').element as HTMLDialogElement;

  /** The button in the dialog with this name */
  const button = (name: string) => {
    const found = Array.from(dialog.querySelectorAll('button')).find(
      (button) => accessibleName(button) === name,
    );
    if (!found) throw new Error(`No button named ${name}`);
    return found;
  };

  return { wrapper, dialog, button };
}

// Before, not after: a useCookie writes its value back as its component
// unmounts, which comes after this file's afterEach
beforeEach(() => {
  document.cookie = 'cookieConsent=; path=/; max-age=0';
  const { cookieConsent, cookiesDialogOpen } = useCookiesDialog();
  cookieConsent.value = {
    necessary: false,
    analytics: false,
    marketing: false,
  };
  cookiesDialogOpen.value = false;
  useGtm.mockClear();
  consentTrigger.accept.mockClear();
});

afterEach(() => {
  useRuntimeConfig().public.gtmId = '';
});

describe('CookiesDialog', () => {
  it('opens on a first visit, as a dialog named "Cookies"', async () => {
    const { dialog } = await mountDialog();

    expect(dialog.open).toBe(true);
    expect(accessibleName(dialog)).toBe('Cookies');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it.each([
    ['accepted', true],
    ['denied', false],
  ])('stays closed when the cookie says it was %s', async (_, granted) => {
    setConsentCookie({
      necessary: true,
      analytics: granted,
      marketing: granted,
    });

    const { dialog } = await mountDialog();

    expect(dialog.open).toBe(false);
  });

  it('opens again for a cookie that is not a choice it offers', async () => {
    setConsentCookie({ necessary: true, analytics: true, marketing: false });

    const { dialog } = await mountDialog();

    expect(dialog.open).toBe(true);
  });

  it('has Accept and Deny described by its text', async () => {
    const { button } = await mountDialog();
    const text = 'We use cookies to improve your experience.';

    expect(description(button('Accept'))).toBe(text);
    expect(description(button('Deny'))).toBe(text);
  });

  it.each([
    ['Accept', true],
    ['Deny', false],
  ])(
    'keeps the choice of %s in the cookie, and closes',
    async (name, granted) => {
      const { dialog, button } = await mountDialog();

      button(name).click();
      await nextTick();

      expect(consentCookie()).toEqual({
        necessary: true,
        analytics: granted,
        marketing: granted,
      });
      await vi.waitFor(() => expect(dialog.open).toBe(false));
    },
  );
});

describe('CookiesDialog and GTM', () => {
  it('asks nothing of Google on Accept without a gtmId', async () => {
    const { dialog, button } = await mountDialog();

    button('Accept').click();
    await nextTick();

    expect(consentCookie()).toEqual({
      necessary: true,
      analytics: true,
      marketing: true,
    });
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(useGtm).not.toHaveBeenCalled();
    expect(consentTrigger.accept).not.toHaveBeenCalled();
  });

  it('loads GTM with the gtmId on Accept', async () => {
    useRuntimeConfig().public.gtmId = 'GTM-TEST';
    const { button } = await mountDialog();

    expect(useGtm).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'GTM-TEST' }),
    );
    expect(consentTrigger.accept).not.toHaveBeenCalled();

    button('Accept').click();
    await nextTick();

    expect(consentTrigger.accept).toHaveBeenCalledOnce();
  });
});

describe('CookiesButton', () => {
  it('says in its name whether cookies are accepted, and opens the dialog', async () => {
    setConsentCookie({ necessary: true, analytics: false, marketing: false });
    const { dialog, button: inDialog } = await mountDialog();
    const wrapper = await mountSuspended(CookiesButton, {
      attachTo: document.body,
    });
    const button = wrapper.get('button');
    expect(accessibleName(button)).toBe('Cookies (Cookies are not accepted)');

    await button.trigger('click');
    expect(dialog.open).toBe(true);

    inDialog('Accept').click();
    await nextTick();

    expect(accessibleName(button)).toBe('Cookies (Cookies are accepted)');
    expect(await checkA11y()).toHaveNoViolations();
  });
});

describe('useCookiesDialog', () => {
  it('opens the dialog from anywhere, with openCookiesDialog', async () => {
    setConsentCookie({ necessary: true, analytics: true, marketing: true });
    const { dialog } = await mountDialog();
    expect(dialog.open).toBe(false);

    useCookiesDialog().openCookiesDialog();
    await nextTick();

    expect(dialog.open).toBe(true);
  });
});
