
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import styles from "./unauthorized.module.css";

export default function UnauthorizedPage() {
  const router = useRouter();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const authReady = initialized && !restoring;

  const isApprovedSeller =
    user?.role === "seller" &&
    user?.sellerApplicationStatus === "approved";

  const applicationStatus = user?.sellerApplicationStatus;

  useEffect(() => {
    if (!authReady) return;

    if (!accessToken || !user) {
      router.replace("/login?redirect=/books");
      return;
    }

    if (user.role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }

    if (isApprovedSeller) {
      router.replace("/seller/dashboard");
    }
  }, [authReady, accessToken, user, isApprovedSeller, router]);

  if (
    !authReady ||
    !accessToken ||
    !user ||
    user.role === "admin" ||
    isApprovedSeller
  ) {
    return (
      <main className={styles.page}>
        <section className={styles.card} role="status">
          <p className={styles.description}>Checking account permissions...</p>
        </section>
      </main>
    );
  }

  const isPending = applicationStatus === "pending";
  const isRejected = applicationStatus === "rejected";

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>CHAPTER. / ACCESS CONTROL</p>

        <div className={styles.status}>
          {isPending ? "…" : isRejected ? "!" : "403"}
        </div>

        <h1>
          {isPending
            ? "Your application is under review."
            : isRejected
              ? "Your application wasn't approved."
              : "Become a Chapter seller."}
        </h1>

        <p className={styles.description}>
          {isPending
            ? "Thank you for applying. Our team is reviewing your application. You can check its status below."
            : isRejected
              ? "Visit your seller application page to review your status and available next steps."
              : "You're signed in as a reader. Apply to become a seller and reach more readers through Chapter."}
        </p>

        <div className={styles.actions}>
          <Link href="/seller/apply" className={styles.primaryButton}>
            {isPending
              ? "Check application status"
              : isRejected
                ? "View application"
                : "Apply to become a seller"}
          </Link>

          <Link href="/books" className={styles.secondaryButton}>
            Browse books
          </Link>
        </div>

        <p className={styles.footerText}>
          {isPending
            ? "Seller dashboard access will be available after approval."
            : isRejected
              ? "You can review the application page for your next steps."
              : "Seller dashboard access requires admin approval."}
        </p>
      </section>
    </main>
  );
}
