export function waterProfile({supply=0,demand=0,reserve=0,quality='UNKNOWN'}={}){return{ supply,demand,reserve,quality,balance:+supply+(+reserve)-(+demand)}}
