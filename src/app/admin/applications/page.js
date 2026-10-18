
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import "./applications.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function SellerApplicationsPage() {
  const router = useRouter();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/books");
    }
  }, [initialized, restoring, accessToken, user, router]);

  const fetchApplications = useCallback(async () => {
    if (!accessToken || user?.role !== "admin") return;

    setLoading(true);
    setPageError("");

    try {
      const response = await fetch(`${API_URL}/sellers/applications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not load seller applications."
        );
      }

      setApplications(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setPageError(
        error.message || "Something went wrong while loading applications."
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, user?.role]);

  useEffect(() => {
    if (initialized && !restoring && accessToken && user?.role === "admin") {
      fetchApplications();
    }
  }, [
    initialized,
    restoring,
    accessToken,
    user?.role,
    fetchApplications,
  ]);

  async function handleReview() {
    if (!confirmAction || reviewingId) return;

    const { applicant, status } = confirmAction;
    setReviewingId(applicant._id);

    try {
      const response = await fetch(
        `${API_URL}/sellers/applications/${applicant._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to review application.");
      }

      toast.success(
        status === "approved"
          ? `${applicant.name} has been approved as a seller.`
          : `${applicant.name}'s application was rejected.`
      );

      setConfirmAction(null);
      await fetchApplications();
    } catch (error) {
      toast.error(error.message || "Could not update the application.");
    } finally {
      setReviewingId("");
    }
  }

  if (
    !initialized ||
    restoring ||
    !accessToken ||
    !user ||
    user.role !== "admin"
  ) {
    return (
      <main className="sellerApplicationsLoading">
        <span className="sellerApplicationsSpinner" />
        <p>Loading seller applications...</p>
      </main>
    );
  }

  return (
    <main className="sellerApplicationsPage">
      <div className="sellerApplicationsContainer">
        <nav className="sellerApplicationsBreadcrumb">
          <Link href="/admin/dashboard">Admin Dashboard</Link>
          <span>/</span>
          <span>Seller Applications</span>
        </nav>

        <header className="sellerApplicationsHeader">
          <div>
            <p className="sellerApplicationsEyebrow">
              CHAPTER. ADMINISTRATION
            </p>
            <h1>Seller Applications</h1>
            <p className="sellerApplicationsSubtitle">
              Review applications and decide who can sell books in your store.
            </p>
          </div>

          <button
            type="button"
            className="sellerApplicationsRefresh"
            onClick={fetchApplications}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        <section className="sellerApplicationsSummary">
          <div>
            <span className="sellerApplicationsSummaryLabel">
              Pending review
            </span>
            <strong>{applications.length}</strong>
            <span className="sellerApplicationsSummaryHint">
              {applications.length === 1
                ? "application needs attention"
                : "applications need attention"}
            </span>
          </div>
          <span className="sellerApplicationsSummaryIcon" aria-hidden="true">
            ♧
          </span>
        </section>

        <section className="sellerApplicationsSection">
          <div className="sellerApplicationsSectionHeading">
            <div>
              <h2>Applications to review</h2>
              <p>Review each request before granting seller access.</p>
            </div>
          </div>

          {loading ? (
            <div className="sellerApplicationsState">
              <span className="sellerApplicationsSpinner" />
              <p>Loading applications...</p>
            </div>
          ) : pageError ? (
            <div className="sellerApplicationsError">
              <span aria-hidden="true">!</span>
              <div>
                <h3>We couldn't load applications</h3>
                <p>{pageError}</p>
                <button type="button" onClick={fetchApplications}>
                  Try again
                </button>
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="sellerApplicationsEmpty">
              <span className="sellerApplicationsEmptyIcon" aria-hidden="true">
                ✓
              </span>
              <h3>You're all caught up</h3>
              <p>
                There are no pending seller applications at the moment.
                New applications will appear here.
              </p>
            </div>
          ) : (
            <div className="sellerApplicationsList">
              {applications.map((applicant) => (
                <article
                  className="sellerApplicationCard"
                  key={applicant._id}
                >
                  <div className="sellerApplicationTop">
                    <div className="sellerApplicationIdentity">
                      <div className="sellerApplicationAvatar" aria-hidden="true">
                        {applicant.name?.trim()?.charAt(0)?.toUpperCase() || "S"}
                      </div>

                      <div className="sellerApplicationApplicant">
                        <h3>{applicant.name}</h3>
                        <p>{applicant.email}</p>
                      </div>
                    </div>

                    <span className="sellerApplicationStatus">
                      <span />
                      Pending
                    </span>
                  </div>

                  <div className="sellerApplicationDetails">
                    <div>
                      <span className="sellerApplicationDetailLabel">
                        Applied on
                      </span>
                      <p>
                        {applicant.sellerAppliedAt
                          ? new Date(
                              applicant.sellerAppliedAt
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Date unavailable"}
                      </p>
                    </div>

                    <div className="sellerApplicationReason">
                      <span className="sellerApplicationDetailLabel">
                        Application reason
                      </span>
                      <p>
                        {applicant.sellerApplicationReason?.trim() ||
                          "No reason was provided."}
                      </p>
                    </div>
                  </div>

                  <div className="sellerApplicationActions">
                    <button
                      type="button"
                      className="sellerApplicationReject"
                      onClick={() =>
                        setConfirmAction({
                          applicant,
                          status: "rejected",
                        })
                      }
                      disabled={Boolean(reviewingId)}
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      className="sellerApplicationApprove"
                      onClick={() =>
                        setConfirmAction({
                          applicant,
                          status: "approved",
                        })
                      }
                      disabled={Boolean(reviewingId)}
                    >
                      Approve seller
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        
      </div>

      {confirmAction && (
        <div
          className="sellerApplicationModalBackdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !reviewingId
            ) {
              setConfirmAction(null);
            }
          }}
        >
          <section
            className="sellerApplicationModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sellerApplicationModalTitle"
          >
            <div className="sellerApplicationModalIcon" aria-hidden="true">
              {confirmAction.status === "approved" ? "✓" : "!"}
            </div>

            <h2 id="sellerApplicationModalTitle">
              {confirmAction.status === "approved"
                ? "Approve this seller?"
                : "Reject this application?"}
            </h2>

            <p>
              {confirmAction.status === "approved"
                ? `${confirmAction.applicant.name} will receive seller access and can manage books through the seller dashboard.`
                : `Are you sure you want to reject ${confirmAction.applicant.name}'s application?`}
            </p>

            <div className="sellerApplicationModalActions">
              <button
                type="button"
                className="sellerApplicationCancel"
                onClick={() => setConfirmAction(null)}
                disabled={Boolean(reviewingId)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  confirmAction.status === "approved"
                    ? "sellerApplicationModalApprove"
                    : "sellerApplicationModalReject"
                }
                onClick={handleReview}
                disabled={Boolean(reviewingId)}
              >
                {reviewingId
                  ? "Processing..."
                  : confirmAction.status === "approved"
                    ? "Confirm approval"
                    : "Confirm rejection"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
