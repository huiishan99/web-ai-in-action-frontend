# Bounded Next ESLint brace expansion

This project retains the official Next 15.5.27 ESLint plugin, fast-glob 3.3.1,
micromatch 4.0.8, Picomatch 2.3.2 and every enabled Next rule. Only the braces
expansion call used by that chain is redirected to the private local package
`@ai-in-action/next-brace-expansion-adapter@0.0.0`. It uses the maintained
`brace-expansion@5.0.12`, with `balanced-match@4.0.4` fixed in the lockfile.

The npm override is scoped to micromatch 4.0.8 and references the root file
dependency through `$braces`. Runtime dependency declarations are unchanged.
This replaces the vulnerable braces 3.0.3 chain without disabling rules,
patching vendor files, suppressing audit findings or claiming a patched braces
release. See [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Contract

The roughly 140-line adapter accepts only a normalized string and the exact
options `{ expand: true, nodupes: true }`. Next normalizes Windows separators
before calling fast-glob. Backslashes, unknown options and other braces APIs
are unsupported. Brace-free patterns bypass expansion in official micromatch.
Directory traversal, extglobs, character classes, dot directories, globstars,
case sensitivity and links remain handled by the original official packages.

Supported expansion includes nested lists, duplicates, empty branches, quoted
literals, character classes, group commas, safe integer ranges with signed or
padded endpoints and integer steps, and ASCII letter ranges.

Unsupported syntax fails explicitly with TypeError or RangeError. Examples
include scientific or fractional numbers, leading-plus endpoints, padded
steps, combining range syntax with lists/nested groups, complex dollar-brace
contexts, and unbalanced quotes/groups on paths that invoke expansion.
The adapter is deliberately narrower than the general braces API: 8,657 of
39,015 independently compared legacy inputs were explicitly rejected; there
were no silent differences in that comparison. Do not describe it as universal
braces compatibility. Current application settings do not specify `next.rootDir`.

Limits are checked before calling the upstream expansion library:

- Input: 4,096 UTF-16 code units, no NUL.
- Group symbols: 128; nesting depth: 32.
- Raw and intermediate expansion branches: 4,096, including empty/duplicate
  branches before deduplication.
- Conservative expanded length: 1,000,000 code units.
- Numeric sequences: at most 1,000 members, with safe integer endpoints/steps.

Upstream exceptions propagate. Unexpected result counts, truncation or output
length overruns are rejected; no partial root list or literal fallback is used.
Use simple supported patterns or explicit directory arrays for future rootDir
settings, and verify the real Next rule behavior after any configuration change.

## Maintenance and regression checks

The project accepts maintenance of this bounded parser and its consumer contract.
Keep its true private identity; do not relabel it as a published braces version.
Do not broaden syntax or limits to hide a failing regression. Node 22 is the
verified application/CI runtime.

For any Next, fast-glob, micromatch or expansion-library upgrade:

1. Inspect every braces consumer and the actual argument/options shape. Check
   rootDir normalization and array handling; do not assume unchanged interfaces.
2. Confirm official vendor files are intact and all currently enabled Next
   rules keep their configured severities. The configuration regression test
   protects the current 21-rule set, including no-html-link-for-pages.
3. Compare supported expansion semantics and directory results against the
   previous verified consumer chain in an isolated fixture. Include quotes,
   nested/empty lists, padded ranges, unsupported contexts, intermediate budget
   overflow, injected upstream exceptions and simulated truncated results.
4. Exercise hidden directories, negated extglobs/classes, static dot/up paths,
   repeated prefixes, globstars, path arrays, Windows separators, case-sensitive
   Linux directories, internal/external-fixture/dangling/file links and cycles.
   Compare raw, logical and physical paths and real Next lint diagnostics.
5. Run strict clean installation, all tests, effective configuration checks,
   typecheck, lint, production build, full/production audits and registry
   signature verification on Windows and Linux. Review the exact final lockfile.

```sh
npm ci --ignore-scripts --strict-peer-deps --legacy-peer-deps=false
npm run test:security
npm run test:glob-adapter
npm run typecheck
npm run lint
npm run build
npm audit
npm audit --omit=dev
npm audit signatures
```

CI runs these checks without database configuration or deployment credentials.
Windows file symlink creation was unavailable in the original local check
(EPERM); the original Linux verification covered all five link classes.
The checked implementation preserved both original hidden-directory lint
diagnostics (`apps/!(web|admin)` and `apps/[!a]*`).

When the official consumer chain provides a usable security fix, prefer removing
this local dependency and override after the same behavior and audit checks.
Reverting this change alone would restore the vulnerable chain; do not treat that
as a security resolution. Platform READY does not verify database functionality,
and removing credentials from source does not prove old credentials are invalid.
