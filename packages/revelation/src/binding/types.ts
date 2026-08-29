export type RevelationBindingDirection='POSITIVE'|'NEGATIVE'|'MIXED'|'UNRESOLVED';

export interface LanguageQueryProfile {
  concept:string;
  coverage:'DIRECT'|'MIXED'|'INDIRECT'|'NONE';
  empiricalRequired?:boolean;
  quranAnchorGroups:string[][];
  focusAnchors?:string[];
  focusMode?:'ACTION'|'SUBJECT'|'NONE';
  witnessQueryPhrases?:string[];
}

export interface RevelationPassageBinding {
  reference:string;
  text:string;
  matchedGroup:string[];
  matchedTokens:string[];
  lexicalCoverage:number;
  directions:RevelationBindingDirection[];
  localDirection:RevelationBindingDirection;
  graphPerspectives:string[];
  evidenceKind:string[];
  grammarFrameIds:string[];
}

export interface RevelationNativeBinding {
  protocol:string;
  version:string;
  action:string;
  concept:string|null;
  coverage:'DIRECT'|'MIXED'|'INDIRECT'|'NONE';
  empiricalRequired:boolean;
  references:string[];
  direct:string[];
  principles:string[];
  direction:RevelationBindingDirection;
  confidence:number;
  status:string;
  pureNormativeDerivation:boolean;
  languageBridge:{used:boolean;normativeAuthority:false;profile:string|null};
  passages:RevelationPassageBinding[];
  witnessQueryPhrases?:string[];
  boundary:string;
}
