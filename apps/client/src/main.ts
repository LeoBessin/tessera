import { createAccumulator } from '@tessera/sim';
import { IntentState } from './input/intents.ts';
import { joinCampaign, type CampaignSession } from './net/session.ts';
import { createRenderer } from './render/scene.ts';

/**
 * The client's composition root and frame loop.
 *
 * Deliberately thin. It owns the browser — canvas, keyboard, requestAnimationFrame —
 * and delegates every decision: rules to `@tessera/sim`, authority and
 * prediction to the session, pixels to the renderer.
 */

const ENDPOINT = import.meta.env['VITE_SERVER_URL'] ?? 'ws://localhost:2567';

/** Shared by every client so the procedural scenery matches across the party. */
const SCENERY_SEED = 20261110;

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
const status = document.querySelector<HTMLElement>('#status');
if (!canvas || !status) throw new Error('missing #stage or #status in the document');

const setStatus = (text: string): void => {
  status.textContent = text;
};

const renderer = createRenderer(canvas, SCENERY_SEED);
const intents = new IntentState();

const fitToWindow = (): void => renderer.resize(window.innerWidth, window.innerHeight);
fitToWindow();
window.addEventListener('resize', fitToWindow);

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  // Only swallow keys the game actually uses; everything else stays the
  // browser's, so refresh and devtools keep working.
  if (intents.press(event.code)) event.preventDefault();
});

window.addEventListener('keyup', (event) => {
  if (intents.release(event.code)) event.preventDefault();
});

// A window that loses focus never delivers its keyups.
window.addEventListener('blur', () => intents.releaseAll());

function startLoop(session: CampaignSession): void {
  const accumulator = createAccumulator();
  let previous = performance.now();
  const known = new Set<string>();

  const frame = (now: number): void => {
    requestAnimationFrame(frame);

    // Drives the accumulator purely so the renderer can interpolate; the
    // authoritative cadence comes from the server via `session.tick`.
    accumulator.advance((now - previous) / 1000);
    previous = now;

    const steps = session.tick(now);
    for (let i = 0; i < steps; i++) session.sendCommand(intents.toCommand());

    const seen = new Set<string>();
    for (const player of session.players()) {
      seen.add(player.sessionId);
      known.add(player.sessionId);
      renderer.upsertPlayer(player.sessionId, {
        x: player.x,
        y: player.y,
        downed: player.downed,
        isSelf: player.isSelf,
      });
      if (player.isSelf) renderer.lookAt(player.x, player.y);
    }

    for (const id of known) {
      if (!seen.has(id)) {
        renderer.removePlayer(id);
        known.delete(id);
      }
    }

    renderer.render();
  };

  requestAnimationFrame(frame);
}

setStatus('connecting…');
try {
  const session = await joinCampaign(ENDPOINT);
  setStatus(`connected · ${session.sessionId}`);
  startLoop(session);
} catch (error) {
  setStatus(`offline — ${error instanceof Error ? error.message : String(error)}`);
  // Still render the world, so a failed connection shows a scene rather than a
  // blank page and leaves the problem visible.
  renderer.render();
}
