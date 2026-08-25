'use client';

import { BrandMark, CivicPublicHeader, useCivicPreferences, type CivicLocale } from '@moonwitness/ui';

const copy = {
  id: {
    nav: ['Sistem', 'Prinsip', 'Status', 'Batas'], eyebrow: 'INFRASTRUKTUR ANALITIS TERBUKA', hero: <>Bukti<br />sebelum <em>kepastian.</em></>,
    lead: 'MoonWitness OS membantu manusia menelusuri observasi, inferensi, sumber, konflik, dan keputusan review tanpa mengubah keluaran perangkat lunak menjadi putusan ilahi.',
    primary: 'Lihat cara kerja', secondary: 'Baca batas sistem', pipeline: 'SATU ALUR YANG DAPAT DITELUSURI', systemTitle: 'Dari teks menuju keputusan yang dapat diaudit.',
    systemBody: 'Setiap lapisan memiliki tanggung jawab dan batasnya sendiri. Tidak ada satu score yang boleh menghapus konflik atau ketidakpastian.', principlesEyebrow: 'PRINSIP DESAIN', principlesTitle: 'Ketidakpastian bukan kegagalan sistem.',
    statusEyebrow: 'STATUS RELEASE', statusTitle: '4.33.0 — certification pending', statusBody: 'Baseline platform dan contract suites telah melewati banyak gate otomatis. Release 4.33.0 belum dinyatakan certified sampai PostgreSQL, build, deployment, provenance, dan same-SHA self-hosted certification selesai.',
    boundaryEyebrow: 'BATAS PENTING', boundaryQuote: 'MoonWitness dapat menunjukkan jejak reasoning dan evidence. Ia tidak mengetahui isi hati, perkara gaib, penerimaan amal, atau keputusan akhir Allah.', boundaryBody: 'Score adalah sinyal rekayasa. Corpus pattern adalah temuan analitis. Human disposition adalah keputusan operasional manusia. Ketiganya tidak boleh dipromosikan menjadi divine judgement.',
    footer: 'Riset & rekayasa · release certification pending · 2026', back: 'Kembali ke atas ↑',
    layers: [['01', 'Korpus Revelation', 'Sumber tekstual disimpan bersama provenance, fingerprint, dan batas otoritas yang eksplisit.'], ['02', 'Interpretasi semantik', 'Bahasa dipetakan menjadi event, relasi, polarity, evidence state, dan ketidakpastian yang dapat diperiksa.'], ['03', 'Tinjauan manusia', 'Kasus provisional, conflicted, atau berisiko tinggi masuk antrean review—bukan dipaksa menjadi kepastian.'], ['04', 'Integritas Witness', 'Hasil penting dikomit ke DAG berbasis hash agar perubahan setelah fakta dapat terdeteksi.']],
    principles: [['Bukti sebelum kepastian', 'Apa yang diamati, disimpulkan, didukung, dan belum diketahui tidak dicampur menjadi satu klaim.'], ['Review sebelum konsekuensi', 'Adverse action diblokir ketika evidence belum cukup atau konflik belum diselesaikan.'], ['Integritas sebelum kenyamanan', 'Analisis asli, gate decision, dan jejak Witness tidak boleh ditulis ulang oleh reviewer.']],
  },
  en: {
    nav: ['System', 'Principles', 'Status', 'Boundaries'], eyebrow: 'OPEN ANALYTICAL INFRASTRUCTURE', hero: <>Evidence<br />before <em>certainty.</em></>,
    lead: 'MoonWitness OS helps people trace observations, inferences, sources, conflicts, and review decisions without turning software output into Divine judgement.',
    primary: 'See how it works', secondary: 'Read system boundaries', pipeline: 'ONE TRACEABLE PIPELINE', systemTitle: 'From text to an auditable decision.', systemBody: 'Every layer has its own responsibility and boundary. No single score may erase conflict or uncertainty.', principlesEyebrow: 'DESIGN PRINCIPLES', principlesTitle: 'Uncertainty is not a system failure.',
    statusEyebrow: 'RELEASE STATUS', statusTitle: '4.33.0 — certification pending', statusBody: 'Core platform and contract suites have passed many automated gates. Release 4.33.0 is not certified until PostgreSQL, builds, deployment, provenance, and same-SHA self-hosted certification are complete.',
    boundaryEyebrow: 'IMPORTANT BOUNDARY', boundaryQuote: 'MoonWitness can expose reasoning and evidence trails. It does not know hearts, the unseen, acceptance of deeds, or Allah’s final judgement.', boundaryBody: 'A score is an engineering signal. A corpus pattern is an analytical finding. A human disposition is an operational decision. None may be promoted into Divine judgement.', footer: 'Research & engineering · release certification pending · 2026', back: 'Back to top ↑',
    layers: [['01', 'Revelation corpus', 'Textual sources retain provenance, fingerprints, and explicit authority boundaries.'], ['02', 'Semantic interpretation', 'Language is mapped into events, relations, polarity, evidence state, and inspectable uncertainty.'], ['03', 'Human review', 'Provisional, conflicted, or high-risk cases enter review instead of being forced into certainty.'], ['04', 'Witness integrity', 'Material results are committed to a hash-based DAG so after-the-fact changes can be detected.']],
    principles: [['Evidence before certainty', 'Observed, inferred, supported, and unknown states are never collapsed into one claim.'], ['Review before consequence', 'Adverse action is blocked when evidence is insufficient or conflicts remain unresolved.'], ['Integrity before convenience', 'Original analysis, gate decisions, and Witness trails cannot be rewritten by a reviewer.']],
  },
} as const;

export default function App() {
  const preferences = useCivicPreferences('id'); const t = copy[preferences.locale];
  const nav = ['system', 'principles', 'status', 'boundaries'].map((id, index) => ({ href: `#${id}`, label: t.nav[index] }));
  return <main id="top"><a className="mw-skip" href="#content">{preferences.locale === 'id' ? 'Lewati ke konten utama' : 'Skip to main content'}</a>
    <div className="shell"><CivicPublicHeader nav={nav} theme={preferences.theme} locale={preferences.locale} onThemeChange={preferences.setTheme} onLocaleChange={(locale: CivicLocale)=>preferences.setLocale(locale)} /></div>
    <div id="content" tabIndex={-1}>
      <section className="hero shell"><div className="hero-copy"><p className="eyebrow"><span /> {t.eyebrow}</p><h1>{t.hero}</h1><p className="lead">{t.lead}</p><div className="hero-actions"><a className="primary" href="#system">{t.primary}</a><a className="secondary" href="#boundaries">{t.secondary}</a></div></div><div className="orbit-card" aria-label="MoonWitness integrity flow"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="core"><span>WITNESS</span><strong>∴</strong><small>verifiable trace</small></div><div className="satellite s1">EVIDENCE</div><div className="satellite s2">REVIEW</div><div className="satellite s3">PROVENANCE</div></div></section>
      <section className="signal-strip" aria-label="Release status"><div className="shell strip-inner"><span>RELEASE <strong>4.33.0</strong></span><span>STATUS <strong>CERTIFICATION PENDING</strong></span><span>QUR’AN <strong>6,236 ayat</strong></span><span>WITNESS <strong>HASH COMMITMENT</strong></span></div></section>
      <section className="section shell" id="system"><div className="section-head"><p className="eyebrow"><span /> {t.pipeline}</p><h2>{t.systemTitle}</h2><p>{t.systemBody}</p></div><div className="layer-grid">{t.layers.map(([n,title,body]) => <article className="layer" key={n}><span className="layer-number">{n}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
      <section className="principles" id="principles"><div className="shell"><div className="section-head compact"><p className="eyebrow"><span /> {t.principlesEyebrow}</p><h2>{t.principlesTitle}</h2></div><div className="principle-grid">{t.principles.map(([title,body], index) => <article key={title}><span>0{index+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>
      <section className="section shell" id="status"><div className="status-card"><div><p className="eyebrow"><span /> {t.statusEyebrow}</p><h2>{t.statusTitle}</h2><p>{t.statusBody}</p></div><div className="status-list"><p><i className="ok" />Contract baseline</p><p><i className="ok" />Security & architecture gates</p><p><i className="pending" />Self-hosted release certification</p><p><i className="pending" />PostgreSQL / build / deployment gates</p></div></div></section>
      <section className="boundary shell" id="boundaries"><p className="eyebrow"><span /> {t.boundaryEyebrow}</p><blockquote>{t.boundaryQuote}</blockquote><p>{t.boundaryBody}</p></section>
    </div><footer><div className="shell footer-inner"><BrandMark /><p>{t.footer}</p><a href="#top">{t.back}</a></div></footer>
  </main>;
}
