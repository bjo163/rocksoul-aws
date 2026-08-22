// @ts-nocheck
export function stableId(scope, type, code) { return `${scope}.${type}.${String(code).toUpperCase().replace(/[^A-Z0-9_-]/g,'_')}`; }
export function parseStableId(id) { const [scope,type,...rest]=String(id).split('.'); return {scope,type,code:rest.join('.')}; }
