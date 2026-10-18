
import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>CHAPTER. / 404</p>

        <h1>
          LOST
          <br />
          YOUR PAGE?
        </h1>

        <p className={styles.description}>
          Looks like this page has left the bookshelf.
          Let’s help you find your next read.
        </p>

        <div className={styles.actions}>
          <Link href="/books" className={styles.primaryButton}>
            Explore books
          </Link>

          <Link href="/" className={styles.secondaryButton}>
            Back home
          </Link>
        </div>
      </div>

      <span className={styles.number}>404</span>
    </main>
  );
}
