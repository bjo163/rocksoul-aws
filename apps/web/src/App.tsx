const layers = [
  ['01', 'Revelation corpus', 'Sumber tekstual disimpan bersama provenance, fingerprint, dan batas otoritas yang eksplisit.'],
  ['02', 'Semantic interpretation', 'Bahasa dipetakan menjadi event, relasi, polarity, evidence state, dan ketidakpastian yang dapat diperiksa.'],
  ['03', 'Human review', 'Kasus provisional, conflicted, atau berisiko tinggi masuk antrean review—bukan dipaksa menjadi kepastian.'],
  ['04', 'Witness integrity', 'Hasil penting dikomit ke DAG berbasis hash agar perubahan setelah fakta dapat terdeteksi.'],
];

const principles = [
  ['Evidence before certainty', 'Apa yang diamati, disimpulkan, didukung, dan belum diketahui tidak dicampur menjadi satu klaim.'],
  ['Review before consequence', 'Adverse action diblokir ketika evidence belum cukup atau konflik belum diselesaikan.'],
  ['Integrity before convenience', 'Analisis asli, gate decision, dan jejak Witness tidak boleh ditulis ulang oleh reviewer.'],
];

export default function App() {
  const cabUrl = import.meta.env.VITE_CAB_URL as string | undefined;
  return <main>
    <nav className="nav shell" aria-label="Navigasi utama">
      <a className="brand" href="#top" aria-label="MoonWitness OS home"><BrandMark /></a>
      <div className="nav-links"><a href="#system">Sistem</a><a href="#principles">Prinsip</a><a href="#status">Status</a>{cabUrl && <a className="cab-link" href={cabUrl}>CAB ↗</a>}</div>
    </nav>

    <section className="hero shell" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><span /> OPEN ANALYTICAL INFRASTRUCTURE</p>
        <h1>Evidence<br />before <em>certainty.</em></h1>
        <p className="lead">MoonWitness OS membantu manusia menelusuri observasi, inferensi, sumber, konflik, dan keputusan review tanpa mengubah keluaran perangkat lunak menjadi putusan ilahi.</p>
        <div className="hero-actions"><a className="primary" href="#system">Lihat cara kerja</a><a className="secondary" href="#boundaries">Baca batas sistem</a></div>
      </div>
      <div className="orbit-card" aria-label="Alur integritas MoonWitness">
        <div className="orbit orbit-a" /><div className="orbit orbit-b" />
        <div className="core"><span>WITNESS</span><strong>∴</strong><small>verifiable trace</small></div>
        <div className="satellite s1">EVIDENCE</div><div className="satellite s2">REVIEW</div><div className="satellite s3">PROVENANCE</div>
      </div>
    </section>

    <section className="signal-strip" aria-label="Status rilis"><div className="shell strip-inner"><span>RELEASE <strong>4.32.0</strong></span><span>CORPUS <strong>18,328 passages</strong></span><span>QUR’AN <strong>6,236 ayat</strong></span><span>WITNESS <strong>HASH COMMITMENT</strong></span></div></section>

    <section className="section shell" id="system">
      <div className="section-head"><p className="eyebrow"><span /> ONE TRACEABLE PIPELINE</p><h2>Dari teks menuju keputusan yang dapat diaudit.</h2><p>Setiap lapisan memiliki tanggung jawab dan batasnya sendiri. Tidak ada satu score yang boleh menghapus konflik atau ketidakpastian.</p></div>
      <div className="layer-grid">{layers.map(([n,title,body]) => <article className="layer" key={n}><span className="layer-number">{n}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
    </section>

    <section className="principles" id="principles"><div className="shell">
      <div className="section-head compact"><p className="eyebrow"><span /> DESIGN PRINCIPLES</p><h2>Ketidakpastian bukan kegagalan sistem.</h2></div>
      <div className="principle-grid">{principles.map(([title,body], index) => <article key={title}><span>0{index+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    </div></section>

    <section className="section shell" id="status">
      <div className="status-card"><div><p className="eyebrow"><span /> CURRENT BASELINE</p><h2>v4.32 integration baseline</h2><p>Semantic, Revelation, Witness, review-gate, web contract, dan API hermetic lanes telah memiliki bukti test lokal. PostgreSQL production dan distributed certification tetap diperlakukan sebagai pekerjaan terpisah.</p></div><div className="status-list"><p><i className="ok" />Preflight & certification</p><p><i className="ok" />1,007 API checks</p><p><i className="ok" />500 adversarial Mīzān cases</p><p><i className="pending" />Production PostgreSQL certification</p></div></div>
    </section>

    <section className="boundary shell" id="boundaries"><p className="eyebrow"><span /> IMPORTANT BOUNDARY</p><blockquote>MoonWitness dapat menunjukkan jejak reasoning dan evidence. Ia tidak mengetahui isi hati, perkara gaib, penerimaan amal, atau keputusan akhir Allah.</blockquote><p>Score adalah sinyal rekayasa. Corpus pattern adalah temuan analitis. Human disposition adalah keputusan operasional manusia. Ketiganya tidak boleh dipromosikan menjadi divine judgement.</p></section>

    <footer><div className="shell footer-inner"><div className="brand"><BrandMark /></div><p>Research & engineering baseline · 2026</p><a href="#top">Kembali ke atas ↑</a></div></footer>
  </main>;
}
import { BrandMark } from '@moonwitness/ui';
