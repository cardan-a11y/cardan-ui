import type { RouteLocationNormalized } from 'vue-router';
import { defineNuxtRouteMiddleware } from '#imports';

// A newer navigation can start before an older one ends. By the location first
// asked for: vue-router runs no `afterEach` for one a guard redirects.
const navigations = new Set<RouteLocationNormalized>();

const navigationOf = (to: RouteLocationNormalized) => to.redirectedFrom ?? to;

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
