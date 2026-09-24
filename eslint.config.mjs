import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat config, loading Next's configs directly.
 *
 * It used to route them through FlatCompat, which is the shim for pulling an
 * OLD eslintrc-style config into a flat one. eslint-config-next 16 already
 * ships flat — both entry points export a plain array of flat config objects —
 * so the shim was converting something that needed no conversion, and eslintrc
 * cannot: its validator JSON.stringify()s each plugin, and eslint-plugin-react
 * holds a reference back to itself through configs.flat.plugins.react.
 *
 *   TypeError: Converting circular structure to JSON
 *       --> starting at object with constructor 'Object'
 *       |     property 'configs' -> object with constructor 'Object'
 *       ...
 *       --- property 'react' closes the circle
 *
 * That failed at config load, so every `npm run lint` died before reading a
 * single file, on a clean checkout, for a reason no source change could fix.
 * CI stopped running lint because of it — which left typecheck as the only
 * gate and no linting at all.
 */
const config = [
  {
    ignores: [
      "capture/**",
      "design/**",
      "scripts/**",
      "enquiry/**",
      "out/**",
      ".next/**",
      "public/img/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
