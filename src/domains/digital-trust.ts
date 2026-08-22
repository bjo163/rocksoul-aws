export function digitalTrustProfile({identities=0,verified=0,incidents=0,openIssues=0}={}){return{identities,verified,verificationRate:+identities?(+verified)/(+identities):0,incidents,openIssues}}
