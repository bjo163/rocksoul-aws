// @ts-nocheck
export function oneDataRecord({code, name, type, source, updatedAt=new Date().toISOString(), data}){ return {code,name,type,source,updatedAt,data,standard:'ONE_DATA_INDONESIA_COMPATIBLE'}; }
export function referenceCode(scope, type, code){ return `IDN.${scope}.${type}.${String(code).toUpperCase()}`; }
