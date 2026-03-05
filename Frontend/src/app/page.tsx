import Link from "next/link";
import styles from "./page.module.css";

const agents = [
  { id: "01", name: "Risk Profiler", accent: "var(--risk-low)", tag: "CatBoost + XAI" },
  { id: "02", name: "Conversion Predictor", accent: "var(--decision-approve)", tag: "CatBoost + XAI" },
  { id: "03", name: "Premium Advisor", accent: "var(--decision-followup)", tag: "Groq LLM" },
  { id: "04", name: "Decision Router", accent: "var(--decision-escalate)", tag: "LLM + Rules" },
];

export default function Home() {
  return (
    <main className={styles.landing}>
      {/* Atmospheric layers */}
      <div className={styles.gridBackdrop} aria-hidden="true" />
      <div className={styles.glowOrb} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.shell}>
        {/* ── Hero ── */}
        <section className={styles.hero}>
          <p className={styles.kicker}>
            <span className={styles.dot} />
            KodryxAI Hackathon 2026&ensp;·&ensp;Use&nbsp;Case&nbsp;3
          </p>

          <h1 className={styles.title}>
            Autonomous<br />Quote Agents
          </h1>

          <p className={styles.subtitle}>
            Four AI agents profile risk, predict conversion, advise on
            premiums, and route only the right cases to human underwriters&nbsp;—
            fully explainable, fully autonomous.
          </p>

          <div className={styles.actions}>
            <Link href="/new-quote" className={styles.primaryBtn}>
              Submit a Quote
            </Link>
            <Link href="/quotes" className={styles.secondaryBtn}>
              Open Dashboard
            </Link>
          </div>
        </section>

        {/* ── Agent Pipeline Strip ── */}
        <section className={styles.pipelineStrip}>
          <p className={styles.stripLabel}>THE PIPELINE</p>
          <div className={styles.agentRow}>
            {agents.map((a, i) => (
              <div key={a.id} className={styles.agentNode}>
                <span className={styles.agentNum} style={{ color: a.accent }}>
                  {a.id}
                </span>
                <span className={styles.agentName}>{a.name}</span>
                <span className={styles.agentTag}>{a.tag}</span>
                {i < agents.length - 1 && (
                  <span className={styles.connector} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Quick Links ── */}
        <nav className={styles.quickNav} aria-label="Modules">
          {[
            { href: "/pipeline", label: "Pipeline Viewer" },
            { href: "/analytics", label: "Analytics" },
            { href: "/regional", label: "Regional Intel" },
            { href: "/escalations", label: "Escalations" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className={styles.navChip}>
              {link.label}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          ))}
        </nav>

        {/* ── Footer line ── */}
        <footer className={styles.footer}>
          <span>Built by Team&nbsp;23</span>
          <span className={styles.sep}>·</span>
          <span>4 Agents&ensp;·&ensp;CatBoost + Groq&ensp;·&ensp;LangGraph</span>
        </footer>
      </div>
    </main>
  );
}
