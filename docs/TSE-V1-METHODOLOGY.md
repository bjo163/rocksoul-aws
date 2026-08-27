# TSE V1 Methodology

Astronomy Engine is accessed only through the provider-neutral
`EphemerisProvider` adapter. A provider computes observable Sun/Moon facts;
TSE adds deterministic interval derivations (night segmentation, crossings,
and illumination) without network calls or database state.

UTC is canonical. Civil-time conversion uses the supplied IANA timezone and is
never implemented with a fixed offset. Rise/set calculations record their
refraction and search-window convention. Unsupported or absent events remain
explicitly unresolved.

The activity label is deliberately excluded from calculation inputs. Prayer,
amal, world activity, dosa, and crime at the same timestamp and location must
produce identical astronomical and temporal facts.

TSE does not infer unseen knowledge, divine reward/punishment, final judgement,
or normative rules. Qur'anic domain evidence and research hypotheses are
separate downstream inputs.
