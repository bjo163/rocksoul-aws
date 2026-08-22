export function fitrahProfile({state="UNKNOWN", guidanceExposure=0, resistance=0}={}) {
  return {state, guidanceExposure, resistance, modeled:true};
}
