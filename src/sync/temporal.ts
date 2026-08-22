// @ts-nocheck
export function temporalRecord({data, validFrom, validTo=null, transactionTime=new Date().toISOString(), version=1}={}) {
  if (!data || !validFrom) throw new Error('data and validFrom are required');
  return {data, validFrom, validTo, transactionTime, version};
}

export function isValidAt(record, instant) {
  const t = new Date(instant).getTime();
  const from = new Date(record.validFrom).getTime();
  const to = record.validTo ? new Date(record.validTo).getTime() : Infinity;
  return t >= from && t < to;
}

export function asOf(records, instant) {
  return records.filter(r=>isValidAt(r, instant)).sort((a,b)=>b.version-a.version)[0] ?? null;
}
