import Link from "next/link";
import DotGrid from "@/components/landing/dot-grid";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.landing}>
      <div className={styles.dotField}>
        <DotGrid
          dotSize={5}
          gap={15}
          baseColor="#1A1A1A"
          activeColor="#F5F5F5"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      <div className={styles.veil} />
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />

      <section className={styles.content}>
        <p className={styles.kicker}>Insurance Decision Intelligence</p>
        <h1 className={styles.title}>AUTONOMOUS QUOTE AGENTS</h1>
        <p className={styles.subtitle}>
          Multi-agent orchestration for risk profiling, conversion prediction,
          premium advisory, and escalations with transparent explainability.
        </p>

        <div className={styles.actions}>
          <Link href="/quotes" className={styles.primaryAction}>
            Enter Platform
          </Link>
          <Link href="/pipeline" className={styles.secondaryAction}>
            View Pipeline
          </Link>
        </div>

        <p className={styles.credit}>done by team-23</p>
      </section>
    </main>
  );
}
