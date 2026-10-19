// Test-only features. Each is also switched on server-side by its own secret,
// so a beta can be closed without a deploy; set the build variable to 'off'
// to remove its route entirely.

/** Machinery beta (/beta/machinery); server switch: MACHINERY_BETA_ENABLED. */
export const MACHINERY_BETA = import.meta.env.VITE_MACHINERY_BETA !== 'off';
