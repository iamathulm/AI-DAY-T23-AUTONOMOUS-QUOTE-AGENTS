import Link from "next/link";
import styles from "./page.module.css";

const agentFlow = [
  {
    id: "01",
    name: "Risk Profiler",
    mode: "Fully Auto",
    summary:
      "CatBoost classifies LOW, MEDIUM, and HIGH risk tiers from driving history and household complexity.",
  },
  {
    id: "02",
    name: "Conversion Predictor",
    mode: "Fully Auto",
    summary:
      "LightGBM predicts bind probability and produces a 0-100 bind score with urgency context.",
  },
  {
    id: "03",
    name: "Premium Advisor",
    mode: "Hybrid",
    summary:
      "Rule-guided pricing bands plus LLM reasoning flag blocker premiums and suggest practical alternatives.",
  },
  {
    id: "04",
    name: "Decision Router",
    mode: "Escalate Only",
    summary:
      "Adaptive thresholds route quotes to AUTO_APPROVE, AGENT_FOLLOWUP, or ESCALATE_UNDERWRITER.",
  },
];

const explainabilityStack = [
  "SHAP feature impact",
  "LIME local surrogate model",
  "Anchor IF-THEN rules",
  "DiCE counterfactual paths",
];

export default function Home() {
  return (
    <main className={styles.landing}>
      <div className={`square-grid-bg ${styles.squareMatrix}`} />

      <div className={styles.grain} />
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      <section className={styles.viewportShell}>
        <div className={styles.frame}>
          <header className={styles.topbar}>
            <p className={styles.kicker}>Insurance Decision Intelligence</p>
            <nav className={styles.quickNav} aria-label="Primary">
              <Link href="/pipeline">Pipeline</Link>
              <Link href="/regional">Regional</Link>
              <Link href="/analytics">Analytics</Link>
            </nav>
          </header>

          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.label}>GITAM Hackathon Use Case 3</p>
              <h1 className={styles.title}>AUTONOMOUS QUOTE AGENTS</h1>
              <p className={styles.subtitle}>
                A live quote operations layer where four autonomous agents
                profile risk, predict conversion, evaluate premiums, and route
                only critical cases to human underwriters.
              </p>

              <div className={styles.actions}>
                <Link href="/quotes" className={styles.primaryAction}>
                  Launch Live Quotes
                </Link>
                <Link href="/pipeline" className={styles.secondaryAction}>
                  Inspect Agent Graph
                </Link>
              </div>

              <div className={styles.metrics}>
                <article>
                  <p>Model Chain</p>
                  <strong>4 Agents</strong>
                </article>
                <article>
                  <p>Decision Paths</p>
                  <strong>3 Routes</strong>
                </article>
                <article>
                  <p>Explainability</p>
                  <strong>4 Methods</strong>
                </article>
                <article>
                  <p>Streaming</p>
                  <strong>SSE Live</strong>
                </article>
              </div>
            </div>

            <aside className={styles.signalPanel}>
              <p className={styles.signalTitle}>Realtime Decision Stream</p>
              <ol className={styles.pipelineRail}>
                <li>
                  <span>Agent 1</span>
                  <strong>Risk Tier: HIGH</strong>
                </li>
                <li>
                  <span>Agent 2</span>
                  <strong>Bind Score: 78</strong>
                </li>
                <li>
                  <span>Agent 3</span>
                  <strong>Premium Flag: BLOCKER</strong>
                </li>
                <li>
                  <span>Agent 4</span>
                  <strong>ESCALATE_UNDERWRITER</strong>
                </li>
              </ol>
              <p className={styles.signalFootnote}>
                Thresholds auto-adjust by region and channel before the final
                routing decision.
              </p>
            </aside>
          </section>
        </div>

        <a href="#details" className={styles.scrollCue}>
          <span>More platform details</span>
          <strong>v</strong>
        </a>
      </section>

      <section id="details" className={styles.details}>
        <div className={styles.detailsFrame}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <p className={styles.sectionTag}>Agent Architecture</p>
              <h2>One quote, four specialist agents, one accountable decision</h2>
            </div>
            <div className={styles.agentGrid}>
              {agentFlow.map((agent) => (
                <article className={styles.agentCard} key={agent.id}>
                  <p className={styles.agentId}>{agent.id}</p>
                  <h3>{agent.name}</h3>
                  <p className={styles.agentMode}>{agent.mode}</p>
                  <p>{agent.summary}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.sectionSplit}>
            <article className={styles.explainabilityCard}>
              <p className={styles.sectionTag}>Transparent AI</p>
              <h2>Each automated decision is audit-ready</h2>
              <p>
                Underwriters do not get black-box outputs. Every quote includes
                explanation artifacts that justify why a score moved up or down,
                and what could change the outcome.
              </p>
              <ul>
                {explainabilityStack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className={styles.routeCard}>
              <p className={styles.sectionTag}>Routing Logic</p>
              <h2>Escalate only when confidence or risk demands it</h2>
              <div className={styles.routeTable}>
                <div>
                  <span>AUTO_APPROVE</span>
                  <p>LOW risk + bind score 75+ + acceptable premium</p>
                </div>
                <div>
                  <span>AGENT_FOLLOWUP</span>
                  <p>Middle band conversion opportunities for field agents</p>
                </div>
                <div>
                  <span>ESCALATE_UNDERWRITER</span>
                  <p>High risk blockers or low confidence predictions</p>
                </div>
              </div>
            </article>
          </section>

          <section className={styles.bottomCta}>
            <div>
              <p className={styles.sectionTag}>Control Center</p>
              <h2>Operate the quote lifecycle from one dashboard</h2>
              <p>
                Monitor pipeline status, review escalations, compare regional
                performance, and act on recommendations in real time.
              </p>
            </div>
            <div className={styles.bottomActions}>
              <Link href="/quotes" className={styles.primaryAction}>
                Open Decision Console
              </Link>
              <Link href="/escalations" className={styles.secondaryAction}>
                Review Escalation Queue
              </Link>
            </div>
          </section>

          <p className={styles.credit}>Built by Team 23</p>
        </div>
      </section>
    </main>
  );
}
