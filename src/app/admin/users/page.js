
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import api from "@/lib/axios";
import styles from "./users.module.css";

function getInitials(name) {
  return (
    String(name || "User")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRole(role) {
  if (!role) return "Unknown";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function AdminUsersPage() {
  const router = useRouter();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [confirmUser, setConfirmUser] = useState(null);

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

  const loadUsers = useCallback(async () => {
    if (!accessToken || user?.role !== "admin") return;

    setLoading(true);
    setLoadError("");

    try {
      const params = {};

      if (search.trim()) params.search = search.trim();
      if (role !== "all") params.role = role;
      if (status !== "all") params.status = status;

      const response = await api.get("/admin/users", { params });
      const result = response.data?.data?.users;

      setUsers(Array.isArray(result) ? result : []);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Unable to load accounts. Please try again.";

      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, user?.role, search, role, status]);

  useEffect(() => {
    if (!initialized || restoring) return;
    if (!accessToken || user?.role !== "admin") return;

    const timer = setTimeout(() => {
      loadUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [
    initialized,
    restoring,
    accessToken,
    user?.role,
    loadUsers,
  ]);

  async function toggleUserStatus() {
    if (!confirmUser?._id || updatingId) return;

    const targetUser = confirmUser;
    const nextIsActive = !targetUser.isActive;
    const action = nextIsActive ? "unblock" : "block";

    setUpdatingId(targetUser._id);

    try {
      const response = await api.patch(
        `/admin/users/${targetUser._id}/status`,
        { isActive: nextIsActive }
      );

      const updatedUser = response.data?.data?.user;

      if (updatedUser) {
        setUsers((currentUsers) =>
          currentUsers.map((item) =>
            item._id === updatedUser._id
              ? { ...item, ...updatedUser }
              : item
          )
        );
      } else {
        await loadUsers();
      }

      setConfirmUser(null);

      if (response.data?.data?.emailSent === false) {
        toast.warning(
          `${
            response.data?.message || "Account status updated."
          } Notification email could not be sent.`
        );
      } else {
        toast.success(
          response.data?.message ||
            `Account ${
              nextIsActive ? "unblocked" : "blocked"
            } successfully.`
        );
      }

      if (status !== "all") {
        await loadUsers();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          `Unable to ${action} this account. Please try again.`
      );
    } finally {
      setUpdatingId("");
    }
  }

  useEffect(() => {
    if (!confirmUser) return;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !updatingId) {
        setConfirmUser(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmUser, updatingId]);

  if (!initialized || restoring || !accessToken || user?.role !== "admin") {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingMark}>C.</div>
        <p>Preparing your workspace…</p>
      </main>
    );
  }

  const activeCount = users.filter((item) => item.isActive).length;
  const blockedCount = users.filter((item) => !item.isActive).length;

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.breadcrumb}>
          <Link href="/admin/dashboard">Administration</Link>
          <span>/</span>
          <span>Manage users</span>
        </div>

        <section className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>ACCOUNT MANAGEMENT</p>
            <h1>Manage users</h1>
            <p className={styles.description}>
              View customer and seller accounts and manage their access to
              your bookstore.
            </p>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={loadUsers}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </section>

        <section className={styles.stats} aria-label="Account summary">
          <article className={styles.statCard}>
            <span>Accounts shown</span>
            <strong>{users.length}</strong>
            <small>Matching your filters</small>
          </article>

          <article className={styles.statCard}>
            <span>Active</span>
            <strong>{activeCount}</strong>
            <small>Currently shown and active</small>
          </article>

          <article className={styles.statCard}>
            <span>Blocked</span>
            <strong>{blockedCount}</strong>
            <small>Currently shown and blocked</small>
          </article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>All accounts</h2>
              <p>Search accounts or narrow the list using filters.</p>
            </div>

            <span className={styles.resultCount}>
              {users.length} {users.length === 1 ? "account" : "accounts"}
            </span>
          </div>

          <div className={styles.filters}>
            <label className={styles.searchField}>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                aria-label="Search users by name or email"
              />
            </label>

            <label className={styles.filterField}>
              <span>Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="all">All roles</option>
                <option value="user">Customer</option>
                <option value="seller">Seller</option>
              </select>
            </label>

            <label className={styles.filterField}>
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>

            <button
              type="button"
              className={styles.clearButton}
              onClick={() => {
                setSearch("");
                setRole("all");
                setStatus("all");
              }}
            >
              Clear filters
            </button>
          </div>

          {loadError && (
            <div className={styles.errorBanner} role="alert">
              <p>{loadError}</p>
              <button type="button" onClick={loadUsers}>
                Try again
              </button>
            </div>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.usersTable}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className={styles.actionHeading}>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className={styles.userCell}>
                        {item.profileImage ? (
                          <img
                            className={styles.avatar}
                            src={item.profileImage}
                            alt=""
                          />
                        ) : (
                          <span className={styles.avatarFallback}>
                            {getInitials(item.name)}
                          </span>
                        )}

                        <div className={styles.userInfo}>
                          <strong>{item.name || "Unnamed user"}</strong>
                          <span>{item.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`${styles.rolePill} ${
                          item.role === "seller"
                            ? styles.sellerRole
                            : styles.customerRole
                        }`}
                      >
                        {formatRole(item.role)}
                      </span>

                      {item.role === "seller" &&
                        item.sellerApplicationStatus && (
                          <small className={styles.applicationStatus}>
                            Seller application:{" "}
                            {item.sellerApplicationStatus}
                          </small>
                        )}
                    </td>

                    <td>{formatDate(item.createdAt)}</td>

                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          item.isActive
                            ? styles.activeStatus
                            : styles.blockedStatus
                        }`}
                      >
                        <span className={styles.statusDot} />
                        {item.isActive ? "Active" : "Blocked"}
                      </span>
                    </td>

                    <td className={styles.actionCell}>
                      <button
                        type="button"
                        className={
                          item.isActive
                            ? styles.blockButton
                            : styles.unblockButton
                        }
                        disabled={Boolean(updatingId)}
                        onClick={() => setConfirmUser(item)}
                      >
                        {updatingId === item._id
                          ? "Updating…"
                          : item.isActive
                            ? "Block account"
                            : "Unblock"}
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && !loadError && users.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyState}>
                        <span className={styles.emptyMark}>⌕</span>
                        <strong>No accounts found</strong>
                        <p>
                          Try a different search term or clear your filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyState}>
                        <span className={styles.spinner} />
                        <strong>Loading accounts…</strong>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.panelFooter}>
            <span>
              Admin accounts are not listed here and cannot be blocked from
              this page.
            </span>
            <span>Chapter. Admin Workspace</span>
          </div>
        </section>
      </div>

      {confirmUser && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !updatingId
            ) {
              setConfirmUser(null);
            }
          }}
        >
          <section
            className={styles.confirmModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
          >
            <div
              className={`${styles.modalIcon} ${
                confirmUser.isActive
                  ? styles.blockModalIcon
                  : styles.unblockModalIcon
              }`}
              aria-hidden="true"
            >
              {confirmUser.isActive ? "!" : "✓"}
            </div>

            <h2 id="confirm-title">
              {confirmUser.isActive
                ? "Block this account?"
                : "Unblock this account?"}
            </h2>

            <p id="confirm-description">
              {confirmUser.isActive
                ? `Are you sure you want to block ${
                    confirmUser.name || "this user"
                  }? They may lose access to their account.`
                : `Are you sure you want to restore access for ${
                    confirmUser.name || "this user"
                  }?`}
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModalButton}
                onClick={() => setConfirmUser(null)}
                disabled={Boolean(updatingId)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  confirmUser.isActive
                    ? styles.confirmBlockButton
                    : styles.confirmUnblockButton
                }
                onClick={toggleUserStatus}
                disabled={Boolean(updatingId)}
              >
                {updatingId
                  ? "Updating…"
                  : confirmUser.isActive
                    ? "Yes, block account"
                    : "Yes, unblock account"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
