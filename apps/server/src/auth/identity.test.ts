import { describe, expect, it } from 'vitest';
import type { IdentityVerifier, PlayerIdentity } from '../ports/IdentityVerifier.ts';
import { authenticateJoin, identityOf, UnauthenticatedError } from './identity.ts';

/**
 * A stand-in for Google, defined here in the test file on purpose.
 *
 * It must never exist in `src/adapters/`: an adapter that hands out identities
 * without verifying anything is the guest mode the design contract forbids, and
 * one that is merely *available* at the composition root is one wiring mistake
 * away from being the way people play.
 */
function verifierAccepting(token: string, identity: PlayerIdentity): IdentityVerifier {
  return {
    async verify(presented) {
      if (presented !== token) throw new Error('bad signature');
      return identity;
    },
  };
}

const ALICE: PlayerIdentity = {
  playerId: '117203948572910384756',
  displayName: 'Alice',
  avatarUrl: 'https://lh3.googleusercontent.com/a/example',
};

describe('authenticating a join', () => {
  it('turns a verified credential into the account that owns the campaign', async () => {
    const verifier = verifierAccepting('good-token', ALICE);
    await expect(authenticateJoin(verifier, 'good-token')).resolves.toEqual(ALICE);
  });

  it('refuses a join that presents no credential at all', async () => {
    // There is no anonymous path. A missing token is a refusal, never a guest.
    const verifier = verifierAccepting('good-token', ALICE);
    await expect(authenticateJoin(verifier, undefined)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(authenticateJoin(verifier, '')).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(authenticateJoin(verifier, '   ')).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('refuses a credential the verifier rejects, rather than degrading', async () => {
    const verifier = verifierAccepting('good-token', ALICE);
    await expect(authenticateJoin(verifier, 'forged-token')).rejects.toThrow();
  });

  it('refuses a credential that carries no subject', async () => {
    // A verifier that answers without a `sub` has not identified anybody, and
    // an empty player id would quietly collide every such player into one save.
    const hollow: IdentityVerifier = {
      async verify() {
        return { playerId: '', displayName: 'Nobody', avatarUrl: null };
      },
    };
    await expect(authenticateJoin(hollow, 'any')).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('cannot be influenced by anything the client sends', () => {
    // The guard rail, enforced by the signature rather than by a check: there
    // is no parameter through which join options could reach this. A forged
    // `playerId` in a join payload has nowhere to arrive.
    expect(authenticateJoin.length).toBe(2);
  });

  it('carries no email, so a campaign cannot be keyed on one by accident', () => {
    // People change their email. Keying on it silently orphans a campaign, so
    // the identity this hands downstream simply does not have the field.
    expect(Object.keys(ALICE).sort()).toEqual(['avatarUrl', 'displayName', 'playerId']);
  });
});

describe('reading the identity of a connected player', () => {
  it('reads the identity the server established', () => {
    expect(identityOf(ALICE)).toEqual(ALICE);
  });

  it('refuses to invent an identity for an unauthenticated session', () => {
    // The old behaviour fell back to the session id, which is thrown away when
    // the socket closes — progress saved against it belongs to nobody.
    expect(() => identityOf(undefined)).toThrow(UnauthenticatedError);
    expect(() => identityOf({})).toThrow(UnauthenticatedError);
    expect(() => identityOf({ playerId: 42 })).toThrow(UnauthenticatedError);
    expect(() => identityOf({ playerId: '' })).toThrow(UnauthenticatedError);
  });
});
