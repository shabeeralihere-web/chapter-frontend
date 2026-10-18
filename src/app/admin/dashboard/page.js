
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "@/lib/axios";
import styles from "./dashboard.module.css";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-IN");

const formatMoney = (value) => money.format(Number(value) || 0);
const formatNumber = (value) => number.format(Number(value) || 0);

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function formatStatus(value) {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(value) {
  return (
    String(value || "User")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}

function StatCard({ label, value, detail, icon }) {
  return (
    <article className={styles.statCard}>
      <div className={styles.statHeading}>
        <span className={styles.statIcon} aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </div>

      <strong className={styles.statValue}>{value}</strong>
      <p className={styles.statDetail}>{detail}</p>
    </article>
  );
}

function SectionHeading({ eyebrow, title, href, linkLabel }) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2>{title}</h2>
      </div>

      {href && (
        <Link className={styles.textLink} href={href}>
          {linkLabel || "View all"} <span aria-hidden="true">↗</span>
        </Link>
      )}
    </div>
  );
}

function EmptyState({ children }) {
  return <div className={styles.emptyState}>{children}</div>;
}

function NavLink({ href, icon, children, active, badge, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${styles.navItem} ${active ? styles.navActive : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className={styles.navIcon} aria-hidden="true">
        {icon}
      </span>

      <span className={styles.navText}>{children}</span>

      {Number(badge) > 0 && (
        <span className={styles.navBadge}>{formatNumber(badge)}</span>
      )}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = Boolean(accessToken && user);
  const isAdmin = user?.role === "admin";
  const authReady = initialized && !restoring;

  // Wait until session restoration finishes before checking permissions.
  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/unauthorized");
    }
  }, [authReady, isAuthenticated, isAdmin, router]);

  const loadDashboard = useCallback(async () => {
    if (!accessToken || user?.role !== "admin") return;

    setLoading(true);
    setLoadError("");

    try {
      const response = await api.get("/admin/dashboard");
      setDashboard(response.data?.data ?? null);
    } catch (error) {
      setLoadError(
        error.response?.data?.message ||
          "Unable to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, user?.role]);

  useEffect(() => {
    if (authReady && isAuthenticated && isAdmin) {
      loadDashboard();
    }
  }, [authReady, isAuthenticated, isAdmin, loadDashboard]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  async function reviewApplication(application, status) {
    if (!application._id || reviewingId) return;

    setReviewingId(application._id);

    try {
      const response = await api.patch(
        `/sellers/applications/${application._id}`,
        { status }
      );

      toast.success(
        response.data?.message || `Seller application ${status}.`
      );

      await loadDashboard();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to review this application."
      );
    } finally {
      setReviewingId("");
    }
  }

  const summary = dashboard?.summary ?? {};
  const salesChart = dashboard?.salesChart ?? [];
  const recentOrders = dashboard?.recentOrders ?? [];
  const lowStockItems = dashboard?.lowStockItems ?? [];
  const pendingApplications = dashboard?.pendingApplicationItems ?? [];

  const maxSales = useMemo(
    () => Math.max(1, ...salesChart.map((item) => Number(item.total) || 0)),
    [salesChart]
  );

  const hasSales = salesChart.some((item) => Number(item.total) > 0);
  const firstName = user?.name?.trim().split(/\s+/)[0];

  // Prevent dashboard content from appearing before authorization is confirmed.
  if (!authReady || !isAuthenticated || !isAdmin) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingMark}>C.</div>
        <p>Preparing your dashboard…</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {mobileMenuOpen && (
        <button
          className={styles.mobileOverlay}
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`${styles.sidebar} ${
          mobileMenuOpen ? styles.sidebarOpen : ""
        }`}
      >
        <div className={styles.sidebarTop}>
          <span className={styles.sidebarEyebrow}>ADMINISTRATION</span>
          <h2 className={styles.sidebarTitle}>Workspace</h2>
        </div>

        <div className={styles.sidebarLabel}>MAIN MENU</div>

        <nav className={styles.navigation} aria-label="Admin navigation">
          <NavLink
            href="/admin/dashboard"
            icon="▦"
            active
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </NavLink>

          <NavLink
            href="/admin/books"
            icon="▤"
            onClick={() => setMobileMenuOpen(false)}
          >
            Manage books
          </NavLink>

          <NavLink
            href="/admin/books/add"
            icon="＋"
            onClick={() => setMobileMenuOpen(false)}
          >
            Add a book
          </NavLink>

          <NavLink
            href="/admin/applications"
            icon="♙"
            badge={summary.pendingApplications}
            onClick={() => setMobileMenuOpen(false)}
          >
            Seller applications
          </NavLink>

          <NavLink
            href="/admin/users"
            icon="♧"
            onClick={() => setMobileMenuOpen(false)}
          >
            Manage users
          </NavLink>

          <NavLink
            href="/admin/orders"
            icon="≡"
            onClick={() => setMobileMenuOpen(false)}
          >
            Orders
          </NavLink>
        </nav>

        <div className={styles.sidebarBottom}>
          <span className={styles.sidebarBottomLabel}>SIGNED IN AS</span>
          <div className={styles.sidebarUser}>
            <span className={styles.sidebarAvatar}>
              {initials(user?.name)}
            </span>

            <span className={styles.sidebarUserInfo}>
              <strong>{user?.name || "Administrator"}</strong>
              <small>Administrator</small>
            </span>

            <span className={styles.onlineDot} aria-label="Online" />
          </div>
        </div>
      </aside>

      <div className={styles.mainArea}>
        <header className={styles.mobileToolbar}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Open navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <span className={styles.toolbarTitle}>Admin dashboard</span>

          <div className={styles.toolbarAvatar}>{initials(user?.name)}</div>
        </header>

        <div className={styles.content}>
          <section className={styles.pageIntro}>
            <div>
              <span className={styles.eyebrow}>OVERVIEW / DASHBOARD</span>

              <h1>
                Welcome back{firstName ? `, ${firstName}` : ""}.
              </h1>

              <p className={styles.introDescription}>
                Monitor your bookstore, review activity, and manage operations.
              </p>
            </div>

            <div className={styles.introActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={loadDashboard}
                disabled={loading}
              >
                <span aria-hidden="true">↻</span>
                {loading ? "Refreshing…" : "Refresh"}
              </button>

              <Link href="/admin/books/add" className={styles.primaryButton}>
                <span aria-hidden="true">＋</span> Add a book
              </Link>
            </div>
          </section>

          {loadError && (
            <div className={styles.errorBanner} role="alert">
              <div>
                <strong>Dashboard data unavailable</strong>
                <p>{loadError}</p>
              </div>

              <button type="button" onClick={loadDashboard}>
                Try again
              </button>
            </div>
          )}

          <section className={styles.statsGrid} aria-label="Store statistics">
            <StatCard
              label="Books in catalogue"
              value={loading && !dashboard ? "—" : formatNumber(summary.totalBooks)}
              detail="Total listed titles"
              icon="▤"
            />

            <StatCard
              label="Customer accounts"
              value={loading && !dashboard ? "—" : formatNumber(summary.totalCustomers)}
              detail="Registered readers"
              icon="♙"
            />

            <StatCard
              label="Seller accounts"
              value={loading && !dashboard ? "—" : formatNumber(summary.totalSellers)}
              detail="Registered sellers"
              icon="♧"
            />

            <StatCard
              label="Total orders"
              value={loading && !dashboard ? "—" : formatNumber(summary.totalOrders)}
              detail="Across all order statuses"
              icon="▣"
            />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>REVENUE & PAYMENTS</span>
                <h2>Sales overview</h2>
                <p className={styles.sectionDescription}>
                  Monitor delivered sales and payment collection.
                </p>
              </div>

              <span className={styles.liveLabel}>
                <span /> Live data
              </span>
            </div>

            <div className={styles.salesMetrics}>
              {[
                ["Delivered sales", summary.deliveredSales, "Value of delivered orders"],
                ["Payments collected", summary.collectedPayments, "Orders recorded as paid"],
                ["Pending payments", summary.pendingPayments, "Orders awaiting payment"],
                ["Delivered orders", summary.deliveredOrdersCount, "Successfully delivered"],
              ].map(([label, value, detail], index) => (
                <article className={styles.salesMetric} key={label}>
                  <span className={styles.metricLabel}>{label}</span>

                  <strong>
                    {loading && !dashboard
                      ? "—"
                      : index === 3
                        ? formatNumber(value)
                        : formatMoney(value)}
                  </strong>

                  <p>{detail}</p>

                  <span className={styles.metricFooter}>
                    {index === 1
                      ? `${formatNumber(summary.paidOrdersCount)} paid orders`
                      : index === 2
                        ? `${formatNumber(summary.pendingPaymentOrdersCount)} pending orders`
                        : "All-time total"}
                  </span>
                </article>
              ))}
            </div>

            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <span className={styles.eyebrow}>SALES HISTORY</span>
                  <h3>Monthly delivered sales</h3>
                  <p className={styles.sectionDescription}>
                    Delivered order value over the last six months.
                  </p>
                </div>

                <span className={styles.chartLegend}>
                  <span /> Sales
                </span>
              </div>

              {salesChart.length > 0 ? (
                <div
                  className={styles.chart}
                  role="img"
                  aria-label="Monthly delivered sales bar chart"
                >
                  {salesChart.map((item, index) => {
                    const amount = Number(item.total) || 0;
                    const height =
                      amount > 0 ? Math.max(5, (amount / maxSales) * 100) : 0;

                    return (
                      <div
                        className={styles.chartColumn}
                        key={`${item.year}-${item.month}`}
                      >
                        <div className={styles.barArea}>
                          {amount > 0 && (
                            <span className={styles.barTooltip}>
                              {formatMoney(amount)}
                            </span>
                          )}

                          <div
                            className={`${styles.bar} ${
                              index === salesChart.length - 1
                                ? styles.barCurrent
                                : ""
                            }`}
                            style={{ height: `${height}%` }}
                            title={`${item.label}: ${formatMoney(amount)}`}
                          />
                        </div>

                        <span className={styles.chartLabel}>{item.label}</span>
                        <span className={styles.chartOrderCount}>
                          {formatNumber(item.orders || 0)} orders
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState>
                  {loading
                    ? "Loading sales history…"
                    : "Sales history will appear here when available."}
                </EmptyState>
              )}

              {salesChart.length > 0 && !hasSales && (
                <p className={styles.chartFootnote}>
                  No delivered sales were recorded in this period.
                </p>
              )}

              <p className={styles.chartFootnote}>
                Monthly totals use the creation date of orders currently marked
                as delivered.
              </p>
            </article>
          </section>

          <section className={styles.twoColumnGrid}>
            <article className={styles.panel}>
              <SectionHeading
                eyebrow="INVENTORY HEALTH"
                title="Stock overview"
                href="/admin/books"
                linkLabel="Manage books"
              />

              <div className={styles.inventoryHighlight}>
                <span>Books needing attention</span>
                <strong>
                  {loading && !dashboard
                    ? "—"
                    : formatNumber(
                        (Number(summary.lowStockBooks) || 0) +
                          (Number(summary.outOfStockBooks) || 0)
                      )}
                </strong>
              </div>

              <div className={styles.inventoryRow}>
                <span>
                  <i className={styles.warningDot} />
                  Low stock <small>1–5 copies</small>
                </span>
                <strong>{formatNumber(summary.lowStockBooks)}</strong>
              </div>

              <div className={styles.inventoryRow}>
                <span>
                  <i className={styles.dangerDot} />
                  Out of stock <small>0 copies</small>
                </span>
                <strong>{formatNumber(summary.outOfStockBooks)}</strong>
              </div>

              <Link href="/admin/books" className={styles.panelFooterLink}>
                Review inventory ↗
              </Link>
            </article>

            <article className={styles.panel}>
              <SectionHeading eyebrow="SHORTCUTS" title="Quick actions" />

              <div className={styles.quickLinks}>
                <Link href="/admin/orders" className={styles.quickLink}>
                  <span className={styles.quickIcon}>≡</span>
                  <span>
                    <strong>Manage orders</strong>
                    <small>Review purchases and fulfilment</small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </Link>

                <Link href="/admin/users" className={styles.quickLink}>
                  <span className={styles.quickIcon}>♙</span>
                  <span>
                    <strong>Manage users</strong>
                    <small>Customer and seller accounts</small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </Link>

                <Link href="/admin/applications" className={styles.quickLink}>
                  <span className={styles.quickIcon}>♧</span>
                  <span>
                    <strong>Seller applications</strong>
                    <small>
                      {formatNumber(summary.pendingApplications)} awaiting review
                    </small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </article>
          </section>

          <section className={styles.panel}>
            <SectionHeading
              eyebrow="LATEST ACTIVITY"
              title="Recent orders"
              href="/admin/orders"
              linkLabel="View all orders"
            />

            <div className={styles.tableWrap}>
              <table className={styles.ordersTable}>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Order status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <strong>
                          {order.orderNumber || String(order._id).slice(-8)}
                        </strong>
                      </td>

                      <td>
                        <div className={styles.customerCell}>
                          <span className={styles.customerAvatar}>
                            {initials(order.user?.name)}
                          </span>

                          <span>
                            <strong>
                              {order.user?.name || "Unknown customer"}
                            </strong>
                            <small>{order.user?.email || "—"}</small>
                          </span>
                        </div>
                      </td>

                      <td>{formatDate(order.createdAt)}</td>
                      <td className={styles.amountCell}>
                        {formatMoney(order.totalAmount)}
                      </td>

                      <td>
                        <span className={styles.statusPill}>
                          {formatStatus(order.paymentStatus)}
                        </span>
                      </td>

                      <td>
                        <span className={styles.statusPill}>
                          {formatStatus(order.orderStatus)}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!loading && recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState>No orders have been placed yet.</EmptyState>
                      </td>
                    </tr>
                  )}

                  {loading && !dashboard && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState>Loading recent orders…</EmptyState>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.twoColumnGrid}>
            <article className={styles.panel}>
              <SectionHeading
                eyebrow="NEEDS ATTENTION"
                title="Low-stock books"
                href="/admin/books"
                linkLabel="View all"
              />

              <div className={styles.stockList}>
                {lowStockItems.map((book) => (
                  <div className={styles.stockItem} key={book._id}>
                    <div className={styles.bookCover}>
                      {book.coverImage ? (
                        <img src={book.coverImage} alt="" />
                      ) : (
                        <span>▤</span>
                      )}
                    </div>

                    <div className={styles.bookInfo}>
                      <strong>{book.title}</strong>
                      <span>{book.author}</span>
                      <small>{formatMoney(book.price)}</small>
                    </div>

                    <span className={styles.stockBadge}>
                      {Number(book.stock) === 0
                        ? "Out of stock"
                        : `${formatNumber(book.stock)} left`}
                    </span>
                  </div>
                ))}

                {!loading && lowStockItems.length === 0 && (
                  <EmptyState>No low-stock books found.</EmptyState>
                )}
              </div>
            </article>

            <article className={styles.panel}>
              <SectionHeading
                eyebrow="SELLER NETWORK"
                title="Pending applications"
                href="/admin/applications"
                linkLabel="Manage all"
              />

              <div className={styles.applicationList}>
                {pendingApplications.map((application) => (
                  <div className={styles.applicationItem} key={application._id}>
                    <div className={styles.applicationAvatar}>
                      {initials(application.name)}
                    </div>

                    <div className={styles.applicationInfo}>
                      <strong>{application.name}</strong>
                      <span>{application.email}</span>

                      <small>
                        Applied {formatDate(application.sellerAppliedAt)}
                      </small>

                      {application.sellerApplicationReason && (
                        <p>{application.sellerApplicationReason}</p>
                      )}

                      <div className={styles.applicationActions}>
                        <button
                          type="button"
                          className={styles.approveButton}
                          disabled={Boolean(reviewingId)}
                          onClick={() =>
                            reviewApplication(application, "approved")
                          }
                        >
                          {reviewingId === application._id
                            ? "Saving…"
                            : "Approve"}
                        </button>

                        <button
                          type="button"
                          className={styles.rejectButton}
                          disabled={Boolean(reviewingId)}
                          onClick={() =>
                            reviewApplication(application, "rejected")
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!loading && pendingApplications.length === 0 && (
                  <EmptyState>No pending seller applications.</EmptyState>
                )}
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
