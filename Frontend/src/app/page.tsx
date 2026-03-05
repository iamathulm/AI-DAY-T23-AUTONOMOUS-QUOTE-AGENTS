import Link from "next/link";
import styles from "./page.module.css";

const quickLinks = [
  { href: "/quotes", label: "Live Quotes Console" },
  { href: "/pipeline", label: "Pipeline Graph" },
  { href: "/regional", label: "Regional Intelligence" },
  { href: "/analytics", label: "Analytics Dashboard" },
  { href: "/escalations", label: "Escalation Queue" },
];

const agentFlow = [
  {
    id: "01",
    name: "Risk Profiler",
    mode: "Fully Auto",
    summary:
      "CatBoost classifies LOW, MEDIUM, and HIGH tiers from driving history, household complexity, and usage patterns.",
    explainability: "SHAP + LIME + Anchor + DiCE",
  },
  {
    id: "02",
    name: "Conversion Predictor",
    mode: "Fully Auto",
    summary:
      "LightGBM predicts bind probability and creates a 0-100 bind score with urgency features.",
    explainability: "SHAP + LIME + Anchor + DiCE",
  },
  {
    id: "03",
    name: "Premium Advisor",
    mode: "Hybrid",
    summary:
      "Rule bands plus Groq Llama reasoning flag blocker premiums and suggest alternatives.",
    explainability: "LLM structured reasoning",
  },
  {
    id: "04",
    name: "Decision Router",
    mode: "Escalate Only",
    summary:
      "Adaptive thresholds route quotes to AUTO_APPROVE, AGENT_FOLLOWUP, or ESCALATE_UNDERWRITER.",
    explainability: "Structured case summary",
  },
];

const explainabilityStack = [
  "SHAP feature impact for global and local drivers",
  "LIME local surrogate explanations for each quote",
  "Anchor IF-THEN rules underwriters can validate",
  "DiCE counterfactual actions to improve bind chance",
  "LLM reasoning for premium and escalation narrative",
];

const decisionRules = [
  {
    decision: "AUTO_APPROVE",
    rule: "LOW risk + bind score >= 75 + premium ACCEPTABLE",
  },
  {
    decision: "AGENT_FOLLOWUP",
    rule: "Middle band opportunities: bind score 40-74 with viable premium",
  },
  {
    decision: "ESCALATE_UNDERWRITER",
    rule: "HIGH risk blockers, low confidence, or risky re-quote pattern",
  },
];

const endpoints = [
  { method: "POST", path: "/api/process-quote", purpose: "Process one quote through all agents" },
  { method: "POST", path: "/api/process-batch", purpose: "Process multiple sample quotes" },
  { method: "GET", path: "/api/stream", purpose: "SSE stream for live pipeline status" },
  { method: "GET", path: "/api/quotes", purpose: "Fetch processed quote records" },
  { method: "GET", path: "/api/stats", purpose: "Aggregate decisions, risks, and bind metrics" },
  { method: "GET", path: "/api/regional-stats", purpose: "Regional and channel performance data" },
];

const buildPlan = [
  {
    owner: "ML + Backend",
    items: [
      "Risk tier engineering and model training",
      "LangGraph StateGraph orchestration",
      "FastAPI + SSE streaming endpoints",
      "Regional threshold adaptation",
    ],
  },
  {
    owner: "Frontend",
    items: [
      "Live quote table and decision badges",
      "Escalation queue and explainability cards",
      "Analytics and regional intelligence views",
      "Responsive, demo-ready command center UI",
    ],
  },
];

export default function Home() {
  return (
    <main className={styles.landing}>
      <div className={styles.gridBackdrop} />
      <div className={styles.grain} />

      <section className={styles.bentoShell}>
        <header className={`${styles.tile} ${styles.heroTile}`}>
          <p className={styles.kicker}>GITAM Hackathon 2026 • Use Case 3</p>
          <h1 className={styles.title}>AUTONOMOUS QUOTE AGENTS</h1>
          <p className={styles.subtitle}>
            A four-agent insurance intelligence pipeline that profiles risk,
            predicts conversion, advises premium moves, and routes only the
            right cases to human underwriters.
          </p>
          <div className={styles.metricRow}>
            <span>4 Agents</span>
            <span>22% Bind Baseline</span>
            <span>SSE Live Pipeline</span>
            <span>Regional Thresholds</span>
          </div>
        </header>

        <nav className={`${styles.tile} ${styles.navTile}`} aria-label="Page redirects">
          <p className={styles.tileTag}>Control Center Links</p>
          <h2>Open any module directly</h2>
          <div className={styles.linkGrid}>
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className={styles.linkBtn}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <article className={`${styles.tile} ${styles.problemTile}`}>
          <p className={styles.tileTag}>Problem Summary</p>
          <h2>Only 1 in 5 quotes converts. Manual review cannot scale.</h2>
          <p>
            The system autonomously processes high quote volume for EA and IA
            channels, reducing manual investigation by escalating only
            confidence-critical cases.
          </p>
        </article>

        <section className={`${styles.tile} ${styles.pipelineTile}`}>
          <p className={styles.tileTag}>Agent Pipeline Architecture</p>
          <h2>One quote travels through four specialist agents</h2>
          <div className={styles.agentGrid}>
            {agentFlow.map((agent) => (
              <article key={agent.id} className={styles.agentCard}>
                <p className={styles.agentId}>Agent {agent.id}</p>
                <h3>{agent.name}</h3>
                <p className={styles.agentMode}>{agent.mode}</p>
                <p>{agent.summary}</p>
                <small>{agent.explainability}</small>
              </article>
            ))}
          </div>
        </section>

        <article className={`${styles.tile} ${styles.explainTile}`}>
          <p className={styles.tileTag}>Explainability Stack</p>
          <h2>Audit-ready outputs at every decision stage</h2>
          <ul className={styles.bulletList}>
            {explainabilityStack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className={`${styles.tile} ${styles.routingTile}`}>
          <p className={styles.tileTag}>Decision Routing Thresholds</p>
          <h2>Escalate only when risk, premium, or confidence requires it</h2>
          <div className={styles.ruleList}>
            {decisionRules.map((rule) => (
              <div key={rule.decision} className={styles.ruleRow}>
                <span>{rule.decision}</span>
                <p>{rule.rule}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.tile} ${styles.regionalTile}`}>
          <p className={styles.tileTag}>Regional + Channel Intelligence</p>
          <h2>Thresholds adapt by region and agent type</h2>
          <p>
            Region-level bind rates and EA vs IA channel behavior dynamically
            influence routing cutoffs to balance automation speed and risk
            control.
          </p>
          <Link href="/regional" className={styles.inlineAction}>
            View Regional Panel
          </Link>
        </article>

        <article className={`${styles.tile} ${styles.endpointTile}`}>
          <p className={styles.tileTag}>FastAPI Surface</p>
          <h2>Endpoints powering the real-time command center</h2>
          <div className={styles.endpointList}>
            {endpoints.map((endpoint) => (
              <div key={endpoint.path} className={styles.endpointRow}>
                <strong>{endpoint.method}</strong>
                <code>{endpoint.path}</code>
                <p>{endpoint.purpose}</p>
              </div>
            ))}
          </div>
        </article>

        <section className={`${styles.tile} ${styles.planTile}`}>
          <p className={styles.tileTag}>12-Hour MVP Build Plan</p>
          <h2>Parallel execution across backend and frontend tracks</h2>
          <div className={styles.planGrid}>
            {buildPlan.map((track) => (
              <article key={track.owner} className={styles.planCard}>
                <h3>{track.owner}</h3>
                <ul className={styles.bulletList}>
                  {track.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <footer className={`${styles.tile} ${styles.footerTile}`}>
          <p>Built by Team 23 • Autonomous Quote Agents</p>
          <div className={styles.footerActions}>
            <Link href="/quotes" className={styles.primaryAction}>
              Launch Live Quotes
            </Link>
            <Link href="/pipeline" className={styles.secondaryAction}>
              Inspect Agent Flow
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
