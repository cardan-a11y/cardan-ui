import type { RouteLocationNormalized } from 'vue-router';
import { defineNuxtRouteMiddleware } from '#imports';

// Per navigation, by the object first asked for (`redirectedFrom` after a redirect; not `fullPath`,
// which two can share): error-origin.test.ts, "ends a navigation that middleware redirected", pins it.
type Navigation =
  | RouteLocationNormalized
  | NonNullable<RouteLocationNormalized['redirectedFrom']>;
const navigations = new Set<Navigation>();

const navigationOf = (to: RouteLocationNormalized): Navigation =>
  to.redirectedFrom ?? to;

/** Whether route middleware of a navigation is running */
export function inMiddleware() {
  return navigations.size > 0;
}

/** Ends a navigation the middleware started; the plugin calls it after each. */
export function endMiddleware(to?: RouteLocationNormalized) {
  if (to) navigations.delete(navigationOf(to));
  else navigations.clear();
}

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.client) navigations.add(navigationOf(to));
});
