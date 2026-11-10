/**
 * Who a player actually is, as the server established it.
 *
 * Derived only from a verified credential, and deliberately small: a Google
 * subject claim, a name to show and a picture. No email — people change theirs,
 * and a campaign keyed on one is a campaign that silently orphans itself the
 * day they do.
 */
export interface PlayerIdentity {
  /**
   * The Google subject claim (`sub`). Stable, unique, and never reassigned,
   * which is the whole reason progression is keyed on it.
   */
  readonly playerId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
}

/**
 * Turns a credential presented at join time into an identity, or refuses.
 *
 * Declared as a port so the room never learns which identity provider is in
 * use, and so the rules around it can be tested without a network, a browser
 * or a Google project.
 *
 * There is no implementation that succeeds without verifying something. An
 * adapter that hands out identities on request would be the guest mode the
 * design contract forbids, and its mere presence at the composition root is one
 * mistake away from becoming how people play.
 */
export interface IdentityVerifier {
  /** Resolves the identity the token proves, or rejects. Never a guest. */
  verify(token: string): Promise<PlayerIdentity>;
}
