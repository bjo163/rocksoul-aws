// @ts-nocheck
export function globalProfile({countryCode, currency, locale}={}){return {countryCode,currency,locale,scope:'GLOBAL_ADAPTER',version:'1.0.0'};}
export function translateNationalId(countryCode, id){return `${countryCode}:${id}`;}
