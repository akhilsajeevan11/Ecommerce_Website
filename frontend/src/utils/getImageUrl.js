/**
 * Resolves an image URL to a full absolute URL.
 * - Full URLs (http/https) are returned as-is (CDN URLs from new uploads)
 * - Relative paths (starting with /) are prefixed with REACT_APP_MEDIA_URL
 *   for backward compatibility with old data
 */
const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || process.env.REACT_APP_BACKEND_URL;

export const getImageUrl = (url) => {
  if (!url) return null;
  // Already a full URL (CDN or external)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Relative path — prepend media URL
  return `${MEDIA_URL}${url}`;
};
