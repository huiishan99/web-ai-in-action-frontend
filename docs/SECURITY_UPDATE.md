# Next.js security update, 2026-10-10

The production build of `web-ai-in-action-frontend` was blocked because it used Next.js 15.3.3. This change starts from the sanitized main commit `b8a6baa0eb1c25b4bcd942a7dcf87d6742a60a8e` and imports no commits from the earlier MongoDB repair branch.

## Versions and compatibility

| Package | Previous lock | New lock | Reason |
| --- | --- | --- | --- |
| next | 15.3.3 | 15.5.27 | Current released Next 15 maintenance security patch |
| eslint-config-next | 15.3.3 | 15.5.27 | Match the framework's lint configuration |
| react / react-dom | 19.1.0 | 19.1.9 | Matched patches within the existing React minor |
| postcss | Next nested 8.4.31 | 8.5.29 | Compatible major-8 override for disclosed source-map vulnerabilities |
| @typescript-eslint parser / plugin | Nested 7.2.0 | 8.71.1 | Supported by the Next config and compatible with existing ESLint 9 and TypeScript 5 |

Runtime Next remains on major 15 and React remains on minor 19.1. The production build still uses webpack. Strict peer installation is enabled rather than relying on `legacy-peer-deps`. The lock also updates vulnerable transitive packages within the dependency ranges declared by their parents. The PostCSS override is explicit because Next pins its nested version; retain it until upstream carries an equivalent fixed dependency.

`lint` uses the ESLint CLI because `next lint` is deprecated in Next 15.5. `typecheck` generates route types before running TypeScript. The only lint exception preserves the existing standalone script and shared helper's CommonJS interface.

## Validation commands

```text
npm ci --ignore-scripts --legacy-peer-deps=false --strict-peer-deps
npm run test:security
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
npm audit
```

The 11 offline regression cases cover absent and blank configuration, lazy loading, passthrough of synthetic configuration, health and input-validation responses, vector-search inputs, active-room selection, and client cleanup on success and failure. They use stubbed database clients and make no real database connection. See [MongoDB configuration](MONGODB_CONFIGURATION.md) for the server-only configuration boundary.

## Remaining disclosed advisory

The production dependency audit reports zero findings. The full audit still reports five development dependency entries from one underlying advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` 3.0.3. As checked on 2026-10-10, the advisory lists no patched version and the official npm package's latest version is still 3.0.3. Its issue concerns deeply nested attacker-supplied patterns; this project uses the chain as development lint tooling. That context does not make the full audit pass.

Do not apply the audit's suggested downgrade to eslint-config-next 14 or force Next to a new major merely to suppress this finding. The PR should remain a draft under a rule requiring all checks to pass and no unresolved issues, until an upstream fix or an explicit risk decision is available.

## Official sources and limits

- [Next September 2026 security release](https://nextjs.org/blog/september-2026-security-release) identifies 15.5.27 as the released maintenance fix.
- [Next 15.5 release](https://nextjs.org/blog/next-15-5) documents ESLint CLI migration and route type generation.
- [React Server Components security update](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components) explains why earlier security patches can require later fixes; upgrading the framework's bundled server-component code remains necessary.
- [PostCSS source-map advisory](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) requires 8.5.23 or later; the override uses the current published major-8 patch.
- [Upcoming Next security update](https://nextjs.org/blog/upcoming-nextjs-security-update-october-2026) plans an update for 2026-10-14 covering two Critical and one High upstream issues. Impact and affected versions were not disclosed when this change was prepared, so this update cannot claim to resolve those future advisories.

A successful build or READY preview is not evidence that the primary production alias was updated. Only a merged main SHA and a production deployment reporting that exact SHA establish release. Neither READY nor a health check proves that MongoDB, chat, or speech integrations have working business configuration. Removing source strings and history also does not prove that previously exposed credentials are invalidated.
