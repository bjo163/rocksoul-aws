/**
 * Coordinates identity and wealth projections without coupling the kernel to
 * a concrete identity or ledger implementation. Adapters provide the two
 * small read ports below.
 */
export interface RidReader {
  get(rid: string): { personId?: string; ruhId?: string; [key: string]: unknown } | null;
}

export interface AssetReader {
  byRid(rid: string): Array<{ rid?: string; [key: string]: unknown }>;
}

export interface WealthProjector {
  (input: { assets: Array<{ rid?: string; [key: string]: unknown }> }): unknown;
}

export interface IdentityValidator {
  (input: { rid: string; personId?: string; ruhId?: string; assetRid: string }): unknown;
}

export interface RelationshipHubOptions {
  ridEngine: RidReader;
  assetLedger: AssetReader;
  wealthProfile?: WealthProjector;
  validateCaseIdentity?: IdentityValidator;
}

export class RelationshipHub {
  private readonly ridEngine: RidReader;
  private readonly assetLedger: AssetReader;
  private readonly wealthProfile: WealthProjector;
  private readonly validateCaseIdentity: IdentityValidator;

  constructor(options: RelationshipHubOptions) {
    this.ridEngine = options.ridEngine;
    this.assetLedger = options.assetLedger;
    this.wealthProfile = options.wealthProfile ?? (() => null);
    this.validateCaseIdentity = options.validateCaseIdentity ?? (() => null);
  }

  profile(rid: string) {
    const identity = this.ridEngine.get(rid);
    if (!identity) throw new Error('Unknown RID');
    const assets = this.assetLedger.byRid(rid);
    return {
      rid,
      identity,
      assets,
      wealth: this.wealthProfile({ assets }),
      integrity: this.validateCaseIdentity({
        rid,
        personId: identity.personId,
        ruhId: identity.ruhId,
        assetRid: assets[0]?.rid ?? rid,
      }),
    };
  }
}
