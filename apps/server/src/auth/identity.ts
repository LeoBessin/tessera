import type { IdentityVerifier, PlayerIdentity } from '../ports/IdentityVerifier.ts';

/**
 * Establishing who is playing.
 *
 * A Google account is required to play: there is no anonymous path, no guest
 * mode and no local-only fallback. Every refusal below is that contract being
 * kept rather than an error being handled, which is why none of them degrade
 * into *some* identity — a join either carries a verified account or it fails.
 */

/** A join that could not be tied to a verified account. */
export class UnauthenticatedError extends Error {
  override readonly name = 'UnauthenticatedError';
}

/**
 * Authenticates a join.
 *
 * Note what this cannot see: there is no parameter through which join options
 * could reach it. A `playerId` arriving in a client's join payload has nowhere
 * to be read from, so the guard rail is a property of the signature rather than
 * a check somebody has to remember to write.
 */
export async function authenticateJoin(
  verifier: IdentityVerifier,
  token: string | undefined,
): Promise<PlayerIdentity> {
  if (typeof token !== 'string' || token.trim() === '') {
    throw new UnauthenticatedError('no credential was presented');
  }

  const identity = await verifier.verify(token);

  // A verifier that answers without a subject has not identified anybody, and
  // an empty id would collide every such player into one shared save.
  if (!isIdentity(identity)) {
    throw new UnauthenticatedError('the verified credential carries no subject');
  }

  return identity;
}

/**
 * Reads the identity the server established for a connected client.
 *
 * This is the only way the rest of the server learns who someone is. It throws
 * rather than inventing anything: the previous behaviour fell back to the
 * session id, a value thrown away when the socket closes, so progress saved
 * against it belonged to nobody and looked like it had worked.
 */
export function identityOf(auth: unknown): PlayerIdentity {
  if (!isIdentity(auth)) {
    throw new UnauthenticatedError('this session has no verified account');
  }
  return auth;
}

function isIdentity(value: unknown): value is PlayerIdentity {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { playerId?: unknown };
  return typeof candidate.playerId === 'string' && candidate.playerId !== '';
}
