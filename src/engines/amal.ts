// @ts-nocheck
import {id,now} from '../core/ids.js';
export function createAmal(input, ruhId){ return {amalId:input.amalId??id('AMAL'),ruhId,timestamp:input.timestamp??now(),action:String(input.action??'UNSPECIFIED').toUpperCase(),intention:String(input.intention??'UNKNOWN'),context:input.context??{},evidence:input.evidence??[],positive:Boolean(input.positive),factors:input.factors??{}}; }
