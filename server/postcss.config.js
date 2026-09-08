/**
 * No-op PostCSS config.
 *
 * The server package is pure Node — it never processes CSS. But Vite (used by
 * Vitest) climbs parent directories looking for a PostCSS config and finds the
 * frontend workspace's, which requires tailwindcss to be installed. Placing a
 * local no-op config here makes it the nearest match, so `npm test` no longer
 * depends on the frontend's dependency tree.
 */
export default {
  plugins: {},
};