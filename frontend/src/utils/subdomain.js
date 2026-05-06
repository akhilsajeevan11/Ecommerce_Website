/**
 * Subdomain detection utility for determining app mode.
 * Returns 'admin' when served from admin.aksou.in, 'customer' otherwise.
 */

/**
 * Returns the current app mode based on the hostname.
 * @returns {'admin' | 'customer'}
 */
export function getAppMode() {
  const hostname = window.location.hostname;
  if (hostname === 'admin.aksou.in') {
    return 'admin';
  }
  return 'customer';
}

/**
 * Returns true if the current hostname is the admin subdomain.
 * @returns {boolean}
 */
export function isAdminSubdomain() {
  return getAppMode() === 'admin';
}
