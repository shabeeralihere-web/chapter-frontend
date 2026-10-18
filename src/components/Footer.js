
import Link from "next/link";
import styles from "./Footer.module.css";

const socialLinks = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle
          cx="12"
          cy="12"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.8-.1-1.6-.2-2.4-.2-2.5 0-4.2 1.5-4.2 4.3v2.2H7.4V13h2.8v8z"
        />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="2.5"
          y="5"
          width="19"
          height="14"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="m10 9 5 3-5 3z" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5.2 8.5H2.1V22h3.1zM3.7 2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6M22 13.8c0-4.1-2.2-6-5.1-6a4.4 4.4 0 0 0-3.9 2.1V8.5H9.9V22H13v-7.2c0-1.9.4-3.7 2.7-3.7s2.3 2.1 2.3 3.8V22h3.1z"
        />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.footerIntro}>
          <p className={styles.eyebrow}>
            FOR THE LOVE OF READING
          </p>

          <h2>
            Every page
            <br />
            <span>opens a world.</span>
          </h2>

          <Link href="/books" className={styles.exploreLink}>
            EXPLORE BOOKS <span>↗</span>
          </Link>
        </div>

        <div className={styles.contact}>
          <p className={styles.eyebrow}>GET IN TOUCH</p>

          <a
            className={styles.email}
            href="mailto:support@example.com"
          >
            Contact Support
          </a>

          <p className={styles.contactText}>
            Questions about an order or need help?
            <br />
            We would love to hear from you.
          </p>

          <div className={styles.socialLinks}>
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${social.name}`}
                className={styles.socialLink}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>
          © {new Date().getFullYear()} · MADE FOR READERS.
        </p>

        <Link href="/privacy">PRIVACY</Link>

        <a href="#top">BACK TO TOP ↑</a>
      </div>
    </footer>
  );
}
