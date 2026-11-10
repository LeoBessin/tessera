/**
 * Recomputes the committed digest of every replay fixture.
 *
 * Run this *deliberately*, when a gameplay change was intended, and review the
 * resulting diff as carefully as any other change — a moved digest is the only
 * warning that the feel of the game has shifted.
 *
 *   pnpm replay:bless
 */
import { readFile, writeFile } from 'node:fs/promises';
import { allReplays } from '../packages/sim/src/replay/fixtures.ts';
import { runReplay } from '../packages/sim/src/replay/replay.ts';

const FIXTURES = new URL('../packages/sim/src/replay/fixtures.ts', import.meta.url);

let source = await readFile(FIXTURES, 'utf8');
let changed = 0;

for (const replay of allReplays) {
  const { hash } = runReplay(replay);
  if (hash === replay.expectedHash) {
    console.log(`  unchanged  ${replay.name}  ${hash}`);
    continue;
  }
  console.log(`  BLESSED    ${replay.name}  ${replay.expectedHash} -> ${hash}`);
  source = source.replace(`expectedHash: '${replay.expectedHash}'`, `expectedHash: '${hash}'`);
  changed += 1;
}

if (changed > 0) {
  await writeFile(FIXTURES, source);
  console.log(`\n${changed} digest(s) updated. Review the diff before committing.`);
} else {
  console.log('\nAll digests already match.');
}
