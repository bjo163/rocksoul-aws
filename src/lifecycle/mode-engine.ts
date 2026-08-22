type Mode = keyof typeof MODES;
type Visibility = typeof VISIBILITY[keyof typeof VISIBILITY];
type PublicationStatus = typeof PUBLICATION_STATUS[keyof typeof PUBLICATION_STATUS];
type PublicationRecord = {ownerId: string | null; mode: Mode; visibility: Visibility; publicationStatus: PublicationStatus; verified: boolean; reviewed: boolean; publishedAt: string | null; supersedes: string | null; supersededBy: string | null};
const MODES = Object.freeze({PERSONAL:'PERSONAL',PRIVATE_BETA:'PRIVATE_BETA',RESEARCH:'RESEARCH',PUBLIC_GUIDE:'PUBLIC_GUIDE',PUBLIC_PLATFORM:'PUBLIC_PLATFORM'} as const);
const MODE_ORDER = Object.freeze(Object.values(MODES) as Mode[]);
const VISIBILITY = Object.freeze({PRIVATE:'PRIVATE',INTERNAL:'INTERNAL',RESEARCH:'RESEARCH',PUBLIC_CANDIDATE:'PUBLIC_CANDIDATE',PUBLIC:'PUBLIC'} as const);
const PUBLICATION_STATUS = Object.freeze({DRAFT:'DRAFT',PRIVATE_RESEARCH:'PRIVATE_RESEARCH',VERIFIED:'VERIFIED',REVIEWED:'REVIEWED',PUBLIC_CANDIDATE:'PUBLIC_CANDIDATE',PUBLISHED:'PUBLISHED',CORRECTED:'CORRECTED',SUPERSEDED:'SUPERSEDED',REJECTED:'REJECTED'} as const);
const MODE_POLICY = Object.freeze({
  PERSONAL:{defaultVisibility:VISIBILITY.PRIVATE,allowPublicPublish:false,requireReviewForPublish:true},
  PRIVATE_BETA:{defaultVisibility:VISIBILITY.INTERNAL,allowPublicPublish:false,requireReviewForPublish:true},
  RESEARCH:{defaultVisibility:VISIBILITY.RESEARCH,allowPublicPublish:false,requireReviewForPublish:true},
  PUBLIC_GUIDE:{defaultVisibility:VISIBILITY.PUBLIC_CANDIDATE,allowPublicPublish:true,requireReviewForPublish:true},
  PUBLIC_PLATFORM:{defaultVisibility:VISIBILITY.PUBLIC,allowPublicPublish:true,requireReviewForPublish:true}
});
const PUBLIC_FLOW = new Map<PublicationStatus, Set<PublicationStatus>>([
  [PUBLICATION_STATUS.DRAFT,new Set([PUBLICATION_STATUS.PRIVATE_RESEARCH,PUBLICATION_STATUS.REJECTED])],
  [PUBLICATION_STATUS.PRIVATE_RESEARCH,new Set([PUBLICATION_STATUS.VERIFIED,PUBLICATION_STATUS.REJECTED])],
  [PUBLICATION_STATUS.VERIFIED,new Set([PUBLICATION_STATUS.REVIEWED,PUBLICATION_STATUS.CORRECTED])],
  [PUBLICATION_STATUS.REVIEWED,new Set([PUBLICATION_STATUS.PUBLIC_CANDIDATE,PUBLICATION_STATUS.CORRECTED])],
  [PUBLICATION_STATUS.PUBLIC_CANDIDATE,new Set([PUBLICATION_STATUS.PUBLISHED,PUBLICATION_STATUS.REJECTED])],
  [PUBLICATION_STATUS.PUBLISHED,new Set([PUBLICATION_STATUS.CORRECTED,PUBLICATION_STATUS.SUPERSEDED])],
  [PUBLICATION_STATUS.CORRECTED,new Set([PUBLICATION_STATUS.VERIFIED,PUBLICATION_STATUS.REVIEWED,PUBLICATION_STATUS.SUPERSEDED])],
  [PUBLICATION_STATUS.SUPERSEDED,new Set([])],
  [PUBLICATION_STATUS.REJECTED,new Set([PUBLICATION_STATUS.DRAFT])]
]);
function assertMode(mode: Mode): Mode {if(!Object.values(MODES).includes(mode))throw new Error(`Unsupported mode: ${mode}`);return mode;}
function getModePolicy(mode: Mode){return MODE_POLICY[assertMode(mode) as Mode];}
function getModeInfo(mode: Mode){const m=assertMode(mode as Mode);return {mode:m,order:(MODE_ORDER as readonly string[]).indexOf(m),policy:getModePolicy(m)};}
function canPublish(mode: Mode,status: PublicationStatus,verified: boolean,reviewed: boolean): boolean {const p=getModePolicy(mode);return p.allowPublicPublish&&(status===PUBLICATION_STATUS.PUBLIC_CANDIDATE||status===PUBLICATION_STATUS.REVIEWED)&&(!p.requireReviewForPublish||(verified&&reviewed));}
function transitionPublication(current: PublicationStatus,next: PublicationStatus): boolean {if(current===next)return true;const ok=PUBLIC_FLOW.get(current)?.has(next);if(!ok)throw new Error(`Invalid publication transition: ${current} -> ${next}`);return true;}
function createPublicationRecord({ownerId=null,mode=MODES.PERSONAL,visibility,publicationStatus=PUBLICATION_STATUS.DRAFT}: {ownerId?: string | null; mode?: Mode; visibility?: Visibility; publicationStatus?: PublicationStatus} = {}): PublicationRecord {const m=assertMode(mode as Mode);return {ownerId,mode:m,visibility:visibility??getModePolicy(m).defaultVisibility,publicationStatus,verified:false,reviewed:false,publishedAt:null,supersedes:null,supersededBy:null};}
function proposePublicPublication(record: PublicationRecord): PublicationRecord {transitionPublication(record.publicationStatus,PUBLICATION_STATUS.PUBLIC_CANDIDATE);return {...record,publicationStatus:PUBLICATION_STATUS.PUBLIC_CANDIDATE};}
function markVerified(record: PublicationRecord): PublicationRecord {if(!([PUBLICATION_STATUS.PRIVATE_RESEARCH,PUBLICATION_STATUS.CORRECTED] as PublicationStatus[]).includes(record.publicationStatus))throw new Error(`Cannot verify from ${record.publicationStatus}`);transitionPublication(record.publicationStatus,PUBLICATION_STATUS.VERIFIED);return {...record,publicationStatus:PUBLICATION_STATUS.VERIFIED,verified:true};}
function markReviewed(record: PublicationRecord): PublicationRecord {if(record.publicationStatus!==PUBLICATION_STATUS.VERIFIED)throw new Error('Only verified records can be reviewed');transitionPublication(record.publicationStatus,PUBLICATION_STATUS.REVIEWED);return {...record,publicationStatus:PUBLICATION_STATUS.REVIEWED,reviewed:true};}
function publish(record: PublicationRecord,{now=new Date().toISOString()}: {now?: string} = {}): PublicationRecord {if(!canPublish(record.mode,PUBLICATION_STATUS.PUBLIC_CANDIDATE,record.verified,record.reviewed))throw new Error('Publication gate not satisfied');transitionPublication(record.publicationStatus,PUBLICATION_STATUS.PUBLISHED);return {...record,publicationStatus:PUBLICATION_STATUS.PUBLISHED,visibility:VISIBILITY.PUBLIC,publishedAt:now};}
function correctPublished(record: PublicationRecord): PublicationRecord {if(record.publicationStatus!==PUBLICATION_STATUS.PUBLISHED)throw new Error('Only published records can be corrected');transitionPublication(record.publicationStatus,PUBLICATION_STATUS.CORRECTED);return {...record,publicationStatus:PUBLICATION_STATUS.CORRECTED,visibility:VISIBILITY.PUBLIC_CANDIDATE};}
export {MODES,MODE_ORDER,VISIBILITY,PUBLICATION_STATUS,MODE_POLICY,getModePolicy,getModeInfo,canPublish,transitionPublication,createPublicationRecord,proposePublicPublication,markVerified,markReviewed,publish,correctPublished};
