// @ts-nocheck
export function amanahProfile(amal={}) { const a=amal.context?.amanah??{}; return {present:Boolean(a.present), kept:Boolean(a.kept), breach:a.breach??false}; }
