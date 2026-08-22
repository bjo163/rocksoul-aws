export type Direction = 'R' | 'G' | 'B' | 'L';
export type EssenceMode = 'REFLECTION' | 'DEVIATION';
export type SeverityBand = 4 | 12 | 30 | 70;
export type PersonState = 'CREATION' | 'DUNYA' | 'DYING' | 'DECEASED' | 'BARZAKH' | 'RESURRECTION' | 'MAHSHAR' | 'HISAB' | 'MIZAN' | 'FINAL_STATE';
export type Destination = 'JANNAH_MODEL' | 'JAHANNAM_MODEL' | 'NOT_DETERMINABLE';
export type KnowledgeClass = 'KNOWN_BY_SYSTEM' | 'INFERRED' | 'UNCERTAIN' | 'UNKNOWN' | 'DIVINE_ONLY';
export type LedgerSide = 'LEFT_RIGHT_ABSTRACTION' | 'SYSTEM_AUDIT' | 'WITNESS_ABSTRACTION';

export interface RuhIdentity { ruhId: string; state: PersonState; alive: boolean; createdAt: string; }
export interface DirectionVector { R:number; G:number; B:number; L:number; }
export interface AsmaHit { id:number; name:string; family:string; direction:Direction; weight:number; }
export interface SemanticProfile { primary: AsmaHit | null; secondary: AsmaHit[]; vector:DirectionVector; mode:EssenceMode; }
export interface AmalEvent { amalId:string; ruhId:string; timestamp:string; action:string; intention:string; context:Record<string,unknown>; evidence:string[]; positive:boolean; factors:Record<string,number>; }
export interface Evaluation { band:SeverityBand; raw:number; drivers:Record<string,number>; }
export interface MizanResult { base:number; factors:Record<string,number>; score:number; severity:Evaluation; semantic:SemanticProfile; }
export interface EngineResult { ruhId:string; state:PersonState; amal:AmalEvent; semantic:SemanticProfile; special:string[]; wealth:Record<string,unknown>; rights:Record<string,unknown>; harm:Record<string,unknown>; accountability:Record<string,unknown>; mizan:MizanResult; destination:Destination; knowledge:KnowledgeClass[]; warnings:string[]; }
