// @ts-nocheck
export function confidenceBand(score){ const s=Math.max(0,Math.min(1,Number(score)||0)); return s>=0.85?'HIGH':s>=0.6?'MEDIUM':'LOW'; }
