// @ts-nocheck
import { runtimeDataset } from '../persistence/runtime-data.js';
const getCountries = () => runtimeDataset('data/countries.json') as any[];
export function getCountry(id){ return getCountries().find(x=>x.id===id) ?? null; }
export function listCountries(){ return [...getCountries()]; }
