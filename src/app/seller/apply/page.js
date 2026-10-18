
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import styles from "./apply.module.css";

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getApplicationStatus(data, user) {
  const status =
    data?.sellerApplicationStatus ??
    data?.status ??
    data?.application?.sellerApplicationStatus ??
    data?.application?.status;

  if (status) return String(status).toLowerCase();

  if (user?.role === "seller") return "approved";

  return "none";
}

export default function SellerApplyPage() {
  const router = useRouter();
  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [status, setStatus] = useState("none");
  const [reason, setReason] = useState("");
  const [applicationReason, setApplicationReason] = useState("");
  const [appliedAt, setAppliedAt] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadApplication = useCallback(async () => {
    setLoadingStatus(true);
    setError("");

    try {
      const response = await api.get("/sellers/applications/me");
      const data = unwrapResponse(response);
      const application = data?.application ?? data;

      setStatus(getApplicationStatus(application, user));
      setApplicationReason(
        application?.sellerApplicationReason ??
          application?.reason ??
          ""
      );
      setAppliedAt(
        application?.sellerAppliedAt ??
          application?.appliedAt ??
          null
      );
    } catch (requestError) {
      // Some backends return 404 when the user has not applied yet.
      if (requestError.response?.status === 404) {
        setStatus(user?.role === "seller" ? "approved" : "none");
      } else {
        setError(getErrorMessage(requestError));
      }
    } finally {
      setLoadingStatus(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    if (user?.role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }

    if (user?.role === "seller") {
      setStatus("approved");
      setLoadingStatus(false);
      return;
    }

    loadApplication();
  }, [initialized, restoring, accessToken, user, router, loadApplication]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await api.post("/sellers/applications", {
        reason: reason.trim(),
      });

      setSuccess("Your seller application has been submitted.");
      setReason("");

      await loadApplication();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  if (!initialized || restoring || loadingStatus) {
    return (
      <main className={styles.page}>
        <div className={styles.statusCard} role="status">
          <span className={styles.spinner} />
          <p>Checking your seller application...</p>
        </div>
      </main>
    );
  }

  if (!accessToken || user?.role === "admin") {
    return (
      <main className={styles.page}>
        <div className={styles.statusCard}>
          <h1>Redirecting...</h1>
          <p>Please wait while we open the correct page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>GROW WITH CHAPTER</p>
        <h1>
          Share your books.
          <br />
          <span>Reach new readers.</span>
        </h1>
        <p className={styles.intro}>
          Become a Chapter seller and bring your books to readers looking
          for their next great read.
        </p>
      </section>

      {error && (
        <div className={styles.error} role="alert">
          {error}
          {status === "none" && (
            <button
              type="button"
              className={styles.textButton}
              onClick={loadApplication}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {success && (
        <div className={styles.success} role="status">
          {success}
        </div>
      )}

      {status === "pending" && (
        <section className={styles.statusCard}>
          <span className={`${styles.statusIcon} ${styles.pendingIcon}`}>
            …
          </span>
          <p className={styles.eyebrow}>APPLICATION STATUS</p>
          <h2>Your application is under review</h2>
          <p>
            Thank you for applying. Our admin team will review your
            application. You can return here to check its status.
          </p>
          {appliedAt && (
            <p className={styles.meta}>
              Applied on{" "}
              {new Date(appliedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
          {applicationReason && (
            <div className={styles.reasonBox}>
              <strong>Your application note</strong>
              <p>{applicationReason}</p>
            </div>
          )}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={loadApplication}
          >
            Refresh status
          </button>
        </section>
      )}

      {status === "approved" && (
        <section className={styles.statusCard}>
          <span className={`${styles.statusIcon} ${styles.approvedIcon}`}>
            ✓
          </span>
          <p className={styles.eyebrow}>YOU'RE APPROVED</p>
          <h2>Welcome, Chapter seller!</h2>
          <p>
            Your seller account is ready. Open your dashboard to manage
            your book listings.
          </p>
          <Link
            href="/seller/dashboard"
            className={styles.primaryButton}
          >
            Go to seller dashboard →
          </Link>
        </section>
      )}

      {status === "rejected" && (
        <section className={styles.statusCard}>
          <span className={`${styles.statusIcon} ${styles.rejectedIcon}`}>
            !
          </span>
          <p className={styles.eyebrow}>APPLICATION STATUS</p>
          <h2>Your application wasn't approved</h2>
          <p>
            You can review your details and submit a new application if
            your account is eligible.
          </p>
          {applicationReason && (
            <div className={styles.reasonBox}>
              <strong>Previous application note</strong>
              <p>{applicationReason}</p>
            </div>
          )}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setStatus("none");
              setError("");
            }}
          >
            Apply again
          </button>
        </section>
      )}

      {status === "none" && (
        <section className={styles.formCard}>
          <p className={styles.eyebrow}>SELLER APPLICATION</p>
          <h2>Let's get you started</h2>
          <p className={styles.formIntro}>
            Tell us a little about what you plan to sell. Your application
            will be reviewed by our admin team.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="reason" className={styles.label}>
              About your books{" "}
              <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="reason"
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="For example, the types of books you plan to list..."
              rows={5}
              maxLength={1000}
              className={styles.textarea}
            />
            <p className={styles.characterCount}>
              {reason.length}/1000 characters
            </p>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit application →"}
            </button>
          </form>

          <p className={styles.disclaimer}>
            Your seller access will be enabled only after admin approval.
          </p>
        </section>
      )}
    </main>
  );
}
