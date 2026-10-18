
import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.home}>
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.content}>
        <p className={styles.eyebrow}>
          A WORLD BEYOND THE ORDINARY
        </p>

        <h1>
          READ
          <br />
          <span>WITHOUT</span>
          <br />
          LIMITS.
        </h1>

        <div className={styles.bottomContent}>
          <p className={styles.description}>
            Some stories entertain you.
            <br />
            Others change the way you see everything.
          </p>

          <Link href="/books" className={styles.exploreButton}>
            EXPLORE BOOKS
            <span className={styles.buttonLine} />
          </Link>
        </div>
      </div>

     

     
    </main>
  );
}
