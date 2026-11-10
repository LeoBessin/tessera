/**
 * Composition root.
 *
 * The one place allowed to know which concrete adapters the application runs
 * with. Everything below it depends on interfaces.
 */
import { defineRoom, defineServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ROOM_NAME } from '@tessera/protocol';
import { InMemoryProgressionRepository } from './adapters/InMemoryProgressionRepository.ts';
import { CampaignRoom } from './rooms/CampaignRoom.ts';

const port = Number(process.env['PORT'] ?? 2567);

// Swap this for a Postgres-backed adapter to make progress survive a restart.
CampaignRoom.repository = new InMemoryProgressionRepository();

const server = defineServer({
  transport: new WebSocketTransport(),
  rooms: {
    [ROOM_NAME]: defineRoom(CampaignRoom),
  },
});

await server.listen(port);
console.log(`tessera server listening on :${port}`);
