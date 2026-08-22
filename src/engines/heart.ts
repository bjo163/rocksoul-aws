// @ts-nocheck
export function heartProfile(amal={}) {
  const h=amal.context?.heart??{};
  return {ikhlas:h.ikhlas??null, riya:h.riya??null, kibr:h.kibr??null, hasad:h.hasad??null, sabr:h.sabr??null, shukr:h.shukr??null, tawakkul:h.tawakkul??null, stateKnowledge:"LIMITED"};
}
