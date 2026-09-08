import { StrictMode, useEffect, useMemo, useState, type FormEvent } from "react"
import { createRoot } from "react-dom/client"
import {
  ApplicationShell,
  AWSBoundary,
  AWSLegalScreen,
  Badge,
  Button,
  Input,
  LegalStatus,
  MoonWitnessAssetImage,
  MoonWitnessAssetProvider,
  MoonWitnessRegistryAssetImage,
  SourceBlock,
  type AppResource,
  type BackendState,
} from "@rocksoul/ui"
import "@rocksoul/ui/styles.css"
import "./styles.css"

const ASSET_BASE =
  "https://raw.githubusercontent.com/bjo163/rocksoul-assets/82f20b8a361a19abdc6591fe2f4c67e3fb9d4b05/moonwitness"

const API_BASE = (import.meta.env.VITE_AWS_API_URL ?? "").replace(/\/+$/, "")

type ViewId = "overview" | "case" | "sources" | "legal" | "ops"

const views: ViewId[] = ["overview", "case", "sources", "legal", "ops"]

const resources: AppResource[] = [
  {
    id: "overview",
    label: "Overview",
    href: "#overview",
    group: "System",
    description: "AWS legal intelligence surface and boundary model.",
    shortcut: "O",
    requiredPermission: "authenticated",
  },
  {
    id: "case",
    label: "Case Lookup",
    href: "#case",
    group: "Resource",
    description: "Inspect a normalized legal case bundle and graph.",
    shortcut: "C",
    resource: "LAW",
    requiredPermission: "authenticated",
  },
  {
    id: "sources",
    label: "Sources",
    href: "#sources",
    group: "Resource",
    description: "Official source inventory and revision provenance.",
    shortcut: "S",
    resource: "LAW",
    requiredPermission: "authenticated",
  },
  {
    id: "legal",
    label: "Legal Boundary",
    href: "#legal",
    group: "Workspace",
    description: "Separate evidence reconstruction from legal interpretation.",
    shortcut: "L",
    requiredPermission: "authenticated",
  },
  {
    id: "ops",
    label: "Observability",
    href: "#ops",
    group: "System",
    description: "Research queue, freshness and audit health.",
    shortcut: "R",
    requiredPermission: "authenticated",
  },
]

const notifications = [
  {
    id: "aws-boundary",
    title: "Legal boundary active",
    body: "Legal interpretation remains separate from evidence reconstruction and Mizan.",
    state: "unread" as const,
    variant: "system" as const,
  },
]

const apiRoutes = [
  ["GET", "/api/v1/aws/cases/:id", "Authenticated"],
  ["GET", "/api/v1/aws/cases/:id/graph", "Authenticated"],
  ["GET", "/api/v1/aws/cases/:id/history", "READ_AUDIT"],
  ["GET", "/api/v1/aws/sources", "Authenticated"],
  ["GET", "/api/v1/aws/sources/:id/revisions", "READ_AUDIT"],
  ["GET", "/api/v1/aws/research/runs", "READ_AUDIT"],
  ["GET", "/api/v1/aws/research/reviews", "READ_AUDIT"],
  ["GET", "/api/v1/aws/observability", "READ_AUDIT"],
  ["POST", "/api/v1/aws/research/reanalyze", "COMMAND"],
] as const

async function apiGet(path: string): Promise<any> {
  if (!API_BASE) throw new Error("VITE_AWS_API_URL is not configured for this deployment.")
  const response = await fetch(API_BASE + path, {
    credentials: "include",
    headers: { Accept: "application/json" },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload && typeof payload === "object"
        ? JSON.stringify(payload)
        : response.status + " " + response.statusText
    throw new Error(message)
  }
  return payload
}

function useView() {
  const getView = (): ViewId => {
    const candidate = window.location.hash.replace(/^#/, "") as ViewId
    return views.includes(candidate) ? candidate : "overview"
  }
  const [view, setView] = useState<ViewId>(getView)
  useEffect(() => {
    const update = () => setView(getView())
    window.addEventListener("hashchange", update)
    if (!window.location.hash) window.location.hash = "overview"
    return () => window.removeEventListener("hashchange", update)
  }, [])
  return view
}

function backendState(): BackendState {
  return API_BASE ? "online" : "degraded"
}

function Overview() {
  return (
    <div className="aws-page">
      <div className="aws-shell">
        <section className="aws-hero">
          <div className="aws-hero-copy">
            <div>
              <p className="aws-kicker">AWS / ANGEL WITH SHOTGUN</p>
              <h1 className="aws-title">
                TRACE <span>THE LAW.</span>
              </h1>
              <p className="aws-lede">
                A provenance-first international law and regulation intelligence surface for
                applicability, jurisdiction, authority, competing arguments, uncertainty and
                explainable review.
              </p>
            </div>
            <div>
              <div className="aws-rule">LEGAL TEXT ≠ APPLICABLE LAW</div>
              <div className="aws-actions">
                <Button onClick={() => { window.location.hash = "case" }} trailing="→">
                  Inspect a case
                </Button>
                <Button variant="secondary" onClick={() => { window.location.hash = "legal" }}>
                  Legal boundary
                </Button>
              </div>
            </div>
          </div>
          <div className="aws-hero-asset" aria-label="Canonical Rocksoul legal visual">
            <MoonWitnessAssetImage
              pack="hero-backgrounds"
              file="svg/legal-boundary-field.svg"
              className="aws-hero-background"
              alt=""
              aria-hidden="true"
            />
            <MoonWitnessRegistryAssetImage
              pack="product-icons"
              assetId="legal"
              className="aws-hero-icon"
              alt="Legal intelligence"
            />
          </div>
        </section>

        <div className="aws-grid aws-grid-4 aws-stats">
          <div className="aws-stat">
            <span className="aws-stat-label">Legal result vocabulary</span>
            <strong>05</strong>
            <p>Permitted · Restricted · Prohibited · Disputed · Unresolved</p>
          </div>
          <div className="aws-stat">
            <span className="aws-stat-label">Applicability axes</span>
            <strong>04</strong>
            <p>Temporal · Territorial · Personal · Subject-matter scope</p>
          </div>
          <div className="aws-stat">
            <span className="aws-stat-label">Native AWS operations</span>
            <strong>09</strong>
            <p>Case, graph, history, sources, research, observability and re-analysis</p>
          </div>
          <div className="aws-stat">
            <span className="aws-stat-label">Auto verdict paths</span>
            <strong>00</strong>
            <p>Research may automate discovery; canonical legal conclusions still require review.</p>
          </div>
        </div>

        <section className="aws-section">
          <div className="aws-section-head">
            <div>
              <p className="aws-section-kicker">01 / BOUNDARY MODEL</p>
              <h2>Evidence first. Law after the line.</h2>
            </div>
            <p>
              The interface keeps source provenance, legal applicability and Mizan analysis visibly
              separate. A source can be authoritative without applying to every actor, place or time.
            </p>
          </div>
          <div className="aws-grid aws-grid-2" style={{ marginTop: 18 }}>
            <AWSBoundary legalState="unresolved">
              <p>Reconstruct the event and evidence before asking the legal question.</p>
            </AWSBoundary>
            <LegalStatus
              status="unresolved"
              jurisdiction="TO BE ESTABLISHED"
              review="HUMAN REVIEW REQUIRED"
              prompt="Which legal system or forum can govern the conduct, which instrument was in force, who was bound, and what exceptions or competing rules matter?"
              basis="No legal conclusion is inferred from the interface."
            />
          </div>
        </section>

        <section className="aws-section">
          <div className="aws-section-head">
            <div>
              <p className="aws-section-kicker">02 / MACHINE CONTRACT</p>
              <h2>API surface stays inspectable.</h2>
            </div>
            <p>
              UI consumers talk to the stable AWS query API. They do not read corpus folders or
              persistence layout directly.
            </p>
          </div>
          <div className="aws-route-list" style={{ marginTop: 18 }}>
            {apiRoutes.map(([method, path, auth]) => (
              <div className="aws-route" key={method + path}>
                <strong>{method}</strong>
                <code>{path}</code>
                <Badge variant={auth === "Authenticated" ? "neutral" : auth === "COMMAND" ? "contested" : "info"}>
                  {auth}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        <Footer />
      </div>
    </div>
  )
}

function CaseLookup() {
  const [caseId, setCaseId] = useState("")
  const [caseData, setCaseData] = useState<any>(null)
  const [graphData, setGraphData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const id = caseId.trim()
    if (!id) {
      setError("Enter a case ID such as LCASE-…")
      return
    }
    setLoading(true)
    setError("")
    setCaseData(null)
    setGraphData(null)
    try {
      const [bundle, graph] = await Promise.all([
        apiGet("/api/v1/aws/cases/" + encodeURIComponent(id)),
        apiGet("/api/v1/aws/cases/" + encodeURIComponent(id) + "/graph"),
      ])
      setCaseData(bundle)
      setGraphData(graph)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="aws-page">
      <div className="aws-shell">
        <section className="aws-section" style={{ marginTop: 0 }}>
          <div className="aws-section-head">
            <div>
              <p className="aws-section-kicker">03 / CASE BUNDLE</p>
              <h2>Inspect applicability without flattening uncertainty.</h2>
            </div>
            <p>
              The normalized bundle can carry instruments, jurisdictions, treaty actions,
              authorities, holdings, applicability, claims, assessments and foreign references.
            </p>
          </div>

          <form className="aws-case-form" onSubmit={submit}>
            <Input
              label="Canonical AWS case ID"
              variant="search"
              placeholder="LCASE-…"
              value={caseId}
              onChange={(event) => setCaseId(event.currentTarget.value)}
              helper={API_BASE ? "Uses the authenticated AWS query API." : "Configure VITE_AWS_API_URL to enable live lookup."}
            />
            <Button type="submit" loading={loading}>Load case + graph</Button>
          </form>

          {!API_BASE ? (
            <div className="aws-state">
              This preview is intentionally not inventing legal records. Set <code>VITE_AWS_API_URL</code>
              on Vercel to the authenticated Rocksoul AWS API origin; requests use credentials and
              the backend remains the source of truth.
            </div>
          ) : null}

          {error ? <div className="aws-state error" role="alert">{error}</div> : null}

          {caseData ? (
            <div className="aws-result">
              <div className="aws-grid aws-grid-2">
                <div className="aws-panel">
                  <p className="aws-meta">CASE BUNDLE</p>
                  <h3 className="aws-panel-title">Normalized legal record</h3>
                  <p className="aws-panel-copy">
                    Storage layout remains hidden behind the query service contract.
                  </p>
                </div>
                <div className="aws-panel">
                  <p className="aws-meta">TYPED GRAPH</p>
                  <h3 className="aws-panel-title">Connectivity, not verdict</h3>
                  <p className="aws-panel-copy">
                    Semantic relations and AWS dependency relations remain distinct.
                  </p>
                </div>
              </div>
              <pre>{JSON.stringify({ case: caseData, graph: graphData }, null, 2)}</pre>
            </div>
          ) : null}
        </section>
        <Footer />
      </div>
    </div>
  )
}

function Sources() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      setData(await apiGet("/api/v1/aws/sources"))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }

  const sources = useMemo(() => {
    if (!data || !Array.isArray(data.sources)) return []
    return data.sources
  }, [data])

  return (
    <div className="aws-page">
      <div className="aws-shell">
        <section className="aws-section" style={{ marginTop: 0 }}>
          <div className="aws-section-head">
            <div>
              <p className="aws-section-kicker">04 / SOURCE INVENTORY</p>
              <h2>Authority is visible. Provenance stays attached.</h2>
            </div>
            <p>
              Primary legal material is preferred: official treaty/depositary text, constitutive
              instruments, judgments and official institutional or State material.
            </p>
          </div>
          <div className="aws-actions">
            <Button onClick={load} loading={loading}>Load source inventory</Button>
          </div>
          {!API_BASE ? (
            <div className="aws-note">
              Live source rows are hidden until an AWS API origin is configured. The UI does not
              promote generated citations or placeholder law into canonical material.
            </div>
          ) : null}
          {error ? <div className="aws-state error" role="alert">{error}</div> : null}
          {sources.length ? (
            <div className="aws-source-list">
              {sources.map((source: any, index: number) => {
                const id =
                  source?.id ??
                  source?.sourceId ??
                  source?.source_id ??
                  "SOURCE-" + String(index + 1).padStart(2, "0")
                return (
                  <article className="aws-source-row" key={String(id)}>
                    <div className="aws-source-row-top">
                      <strong>{String(id)}</strong>
                      <Badge variant="verified">SOURCE LINKED</Badge>
                    </div>
                    <pre>{JSON.stringify(source, null, 2)}</pre>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
        <Footer />
      </div>
    </div>
  )
}

function LegalBoundary() {
  return (
    <div className="aws-page">
      <AWSLegalScreen />
      <div className="aws-shell" style={{ paddingTop: 0 }}>
        <div className="aws-note">
          The shared <code>AWSLegalScreen</code> above comes directly from <code>@rocksoul/ui</code>.
          Its fixture is reference-only and explicitly not a court judgment. Production legal data
          should come from the AWS API contracts.
        </div>
        <SourceBlock
          variant="legal-instrument"
          sourceId="AWS-UI-CONTRACT"
          title="Legal presentation boundary"
          excerpt="Evidence reconstruction, applicable law, review state and Mizan remain separate interface layers."
          citation="docs/AWS-PHASE-8-QUERY-API.md"
          provenance="bjo163/rocksoul-aws"
          verification="repository contract"
        />
        <Footer />
      </div>
    </div>
  )
}

function Observability() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      setData(await apiGet("/api/v1/aws/observability"))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="aws-page">
      <div className="aws-shell">
        <section className="aws-section" style={{ marginTop: 0 }}>
          <div className="aws-section-head">
            <div>
              <p className="aws-section-kicker">05 / OPERATIONS</p>
              <h2>Observe the research system, not a legal verdict.</h2>
            </div>
            <p>
              Queue state, source freshness, review backlog and chain integrity are operational
              signals. They are deliberately not presented as evidence or legal conclusions.
            </p>
          </div>
          <div className="aws-grid aws-grid-4 aws-stats">
            <div className="aws-stat">
              <span className="aws-stat-label">Source freshness</span>
              <strong>→</strong>
              <p>Current, changed, stale and unavailable states belong here.</p>
            </div>
            <div className="aws-stat">
              <span className="aws-stat-label">Research runs</span>
              <strong>→</strong>
              <p>Discovery and re-analysis work remains review-bounded.</p>
            </div>
            <div className="aws-stat">
              <span className="aws-stat-label">Review backlog</span>
              <strong>→</strong>
              <p>Pending human work stays distinct from canonical outcomes.</p>
            </div>
            <div className="aws-stat">
              <span className="aws-stat-label">Chain integrity</span>
              <strong>→</strong>
              <p>Event and audit integrity are operational trust signals.</p>
            </div>
          </div>
          <div className="aws-actions">
            <Button onClick={load} loading={loading}>Load observability snapshot</Button>
          </div>
          {!API_BASE ? (
            <div className="aws-note">
              Configure <code>VITE_AWS_API_URL</code> and an authenticated session with
              <code> READ_AUDIT</code> to retrieve the live observability snapshot.
            </div>
          ) : null}
          {error ? <div className="aws-state error" role="alert">{error}</div> : null}
          {data ? <div className="aws-result"><pre>{JSON.stringify(data, null, 2)}</pre></div> : null}
        </section>
        <Footer />
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="aws-footer">
      <span>MOONWITNESS · ROCKSOUL RESEARCH · LAW</span>
      <span>APPLICABILITY · JURISDICTION · AUTHORITY · UNCERTAINTY</span>
    </footer>
  )
}

function App() {
  const view = useView()
  const content =
    view === "case" ? <CaseLookup /> :
    view === "sources" ? <Sources /> :
    view === "legal" ? <LegalBoundary /> :
    view === "ops" ? <Observability /> :
    <Overview />

  return (
    <MoonWitnessAssetProvider baseUrl={ASSET_BASE}>
      <ApplicationShell
        activeResource={view}
        breadcrumbs={[
          { label: "MoonWitness", href: "#overview" },
          { label: "AWS" },
          { label: resources.find((item) => item.id === view)?.label ?? "Overview" },
        ]}
        backendState={backendState()}
        user={{ name: "Rocksoul", role: "legal researcher" }}
        permissions={["authenticated"]}
        resources={resources}
        notifications={notifications}
      >
        {content}
      </ApplicationShell>
    </MoonWitnessAssetProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
