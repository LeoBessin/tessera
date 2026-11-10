/**
 * Clean architecture, enforced by CI rather than by discipline.
 *
 * The dependency graph is a one-way street:
 *
 *     apps/client  ─┐
 *                   ├─> packages/protocol ─> packages/sim ─> (nothing)
 *     apps/server  ─┘
 *
 * `sim` is the domain. It knows nothing about networking, rendering, Node or
 * the browser, which is precisely what makes it testable in isolation.
 */
module.exports = {
  forbidden: [
    {
      name: 'sim-is-pure',
      comment:
        'packages/sim is the domain core: it must not depend on any other workspace ' +
        'package. If you need something from protocol or an app, the dependency is ' +
        'pointing the wrong way — invert it.',
      severity: 'error',
      from: { path: '^packages/sim' },
      // Matches both the resolved path and the bare specifier: because sim
      // declares no dependencies, pnpm gives it no symlink to resolve, so a
      // forbidden import shows up unresolved rather than as a workspace path.
      to: { path: '^(packages/(?!sim)|apps/|@tessera/(?!sim))' },
    },
    {
      name: 'sim-has-no-runtime-deps',
      comment:
        'packages/sim must stay dependency-free so it runs identically in Node, the ' +
        'browser and a test harness. Adding a library here breaks determinism guarantees.',
      severity: 'error',
      from: { path: '^packages/sim', pathNot: '\\.test\\.ts$' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'] },
    },
    {
      name: 'sim-is-platform-agnostic',
      comment:
        'packages/sim must not touch Node built-ins or browser globals. The domain ' +
        'receives everything it needs as arguments.',
      severity: 'error',
      from: { path: '^packages/sim', pathNot: '\\.test\\.ts$' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'protocol-stays-transport-only',
      comment:
        'packages/protocol defines the wire format. It may depend on sim, but never ' +
        'on an application.',
      severity: 'error',
      from: { path: '^packages/protocol' },
      to: { path: '^apps/' },
    },
    {
      name: 'apps-are-leaves',
      comment: 'Applications are adapters. They never depend on one another.',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/([^/]+)/', pathNot: '^apps/$1/' },
    },
    {
      name: 'no-unresolvable',
      comment:
        'An import that cannot be resolved is either a typo or a dependency the ' +
        'package never declared. Left unflagged it also hides architecture ' +
        'violations, since an unresolved module has no path to match rules against.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      // Config files are entry points for their own tools; nothing imports them.
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '(^|/)[^/]+\\.config\\.ts$'] },
      to: {},
    },
  ],
  options: {
    // dependency-cruiser does not yet support the TypeScript 7 compiler API, and
    // silently cruises zero modules without a parser it recognises — a gate that
    // reports success while checking nothing. swc parses the same sources.
    parser: 'swc',
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(node_modules|dist|coverage|\\.turbo)' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'types', 'default'],
      extensions: ['.ts', '.js'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
