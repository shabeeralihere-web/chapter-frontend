
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  LuArrowLeft,
  LuChevronRight,
  LuUserRound,
  LuMail,
  LuShieldCheck,
  LuPencil,
  LuLogOut,
  LuX,
  LuLoaderCircle,
} from "react-icons/lu";

import { logout } from "@/store/auth/authSlice";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { user, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (logoutModalOpen) {
      function handleKeyDown(event) {
        if (event.key === "Escape" && !loggingOut) {
          setLogoutModalOpen(false);
        }
      }

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [logoutModalOpen, loggingOut]);

  if (!initialized || restoring) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <LuLoaderCircle className={styles.spinner} size={25} />
          <p>Loading your profile...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/books">Books</Link>
            <LuChevronRight size={17} />
            <span>Profile</span>
          </nav>

          <section className={styles.emptyCard}>
            <div className={styles.iconBox}>
              <LuUserRound size={30} />
            </div>

            <h1>Sign in to view your profile</h1>
            <p>
              Sign in to manage your personal information and
              Chapter. account.
            </p>

            <Link href="/login" className={styles.primaryButton}>
              Sign in
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const initial = (user.name || "U").trim().charAt(0).toUpperCase();

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      dispatch(logout());
      setLogoutModalOpen(false);
      router.replace("/");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/books" className={styles.breadcrumbBack}>
            <LuArrowLeft size={18} strokeWidth={2.5} />
            <span>Back to books</span>
          </Link>

          <LuChevronRight className={styles.breadcrumbSeparator} size={17} />

          <span className={styles.currentBreadcrumb}>My Profile</span>
        </nav>

        {/* Page heading */}
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>YOUR ACCOUNT</p>
            <h1>My Profile</h1>
            <p className={styles.pageDescription}>
              Manage your personal details and account information.
            </p>
          </div>
        </header>

        {/* Profile card */}
        <section className={styles.card}>
          <div className={styles.profileHeader}>
            <div className={styles.avatar}>
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={`${user.name || "User"} profile`}
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>

            <div className={styles.identity}>
              <h2>{user.name || "Book lover"}</h2>
              <p className={styles.emailLine}>
                <LuMail size={17} />
                <span>{user.email || "Email not provided"}</span>
              </p>

              <span className={styles.role}>
                <LuShieldCheck size={15} />
                {(user.role || "user").toUpperCase()}
              </span>
            </div>

            <Link
              href="/profile/edit"
              className={styles.editButton}
            >
              <LuPencil size={17} strokeWidth={2.5} />
              <span>Edit profile</span>
            </Link>
          </div>

          <div className={styles.divider} />

          <div className={styles.sectionHeading}>
            <h3>Personal information</h3>
            <p>Your account details currently on file.</p>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detail}>
              <span className={styles.detailLabel}>
                <LuUserRound size={17} />
                Full name
              </span>
              <p>{user.name || "Not provided"}</p>
            </div>

            <div className={styles.detail}>
              <span className={styles.detailLabel}>
                <LuMail size={17} />
                Email address
              </span>
              <p className={styles.detailValue}>
                {user.email || "Not provided"}
              </p>
            </div>

            <div className={`${styles.detail} ${styles.fullWidth}`}>
              <span className={styles.detailLabel}>About me</span>
              <p className={styles.bio}>
                {user.bio || "You haven't added a bio yet."}
              </p>
            </div>
          </div>

          <div className={styles.cardActions}>
            <Link
              href="/profile/edit"
              className={styles.primaryButton}
            >
              <LuPencil size={18} strokeWidth={2.5} />
              Edit profile
            </Link>
          </div>
        </section>

        {/* Account actions */}
        <section className={styles.accountSection}>
          <div className={styles.accountText}>
            <h2>Account session</h2>
            <p>
              Sign out of your Chapter. account on this device.
            </p>
          </div>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => setLogoutModalOpen(true)}
          >
            <LuLogOut size={19} strokeWidth={2.5} />
            Logout
          </button>
        </section>
      </div>

      {/* Logout confirmation modal */}
      {logoutModalOpen && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loggingOut
            ) {
              setLogoutModalOpen(false);
            }
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
          >
            <button
              type="button"
              className={styles.modalClose}
              aria-label="Close confirmation"
              disabled={loggingOut}
              onClick={() => setLogoutModalOpen(false)}
            >
              <LuX size={21} />
            </button>

            <div className={styles.modalIcon}>
              <LuLogOut size={27} strokeWidth={2.2} />
            </div>

            <p className={styles.modalEyebrow}>ACCOUNT SESSION</p>

            <h2 id="logout-title">Logout of Chapter.?</h2>

            <p id="logout-description">
              Are you sure you want to sign out? You'll need to sign
              in again to access your account.
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={loggingOut}
                onClick={() => setLogoutModalOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.confirmLogoutButton}
                disabled={loggingOut}
                onClick={handleLogout}
              >
                {loggingOut ? (
                  <>
                    <LuLoaderCircle className={styles.spinner} size={18} />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LuLogOut size={18} />
                    Confirm logout
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
