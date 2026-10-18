
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { fetchCart } from "@/store/cart/cartThunks";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();
  const dispatch = useDispatch();

  const { accessToken, user, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const { totalItems = 0 } = useSelector((state) => state.cart);

  const [signedIn, setSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role;
  const authReady = initialized && !restoring;

  useEffect(() => {
    const hasToken =
      Boolean(accessToken) ||
      Boolean(localStorage.getItem("accessToken"));

    setSignedIn(hasToken);
  }, [accessToken, pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (
      signedIn &&
      authReady &&
      (role === "user" || role === "seller")
    ) {
      dispatch(fetchCart());
    }
  }, [dispatch, signedIn, authReady, role]);

  const closeMenu = () => setMenuOpen(false);

  const isActive = (href) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const dashboardHref =
    role === "seller"
      ? "/seller/dashboard"
      : role === "admin"
        ? "/admin/dashboard"
        : null;

  const profileImage = user?.profileImage || "";
  const profileName = user?.name || "Profile";

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link
          href="/"
          className={styles.brand}
          aria-label="Chapter home"
          onClick={closeMenu}
        >
          <span className={styles.logoFrame}>
            <Image
              src="/images/chapter-logo.png"
              alt=""
              width={52}
              height={52}
              priority
              className={styles.brandLogo}
            />
          </span>

          <span className={styles.brandName}>
            Chapter<span className={styles.brandDot}>.</span>
          </span>
        </Link>

        <button
          type="button"
          className={styles.menuButton}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <div
          className={`${styles.links} ${menuOpen ? styles.open : ""}`}
        >
          {!signedIn && (
            <>
              <Link
                href="/books"
                onClick={closeMenu}
                className={isActive("/books") ? styles.active : ""}
              >
                Books
              </Link>

              <Link
                href="/login"
                onClick={closeMenu}
                className={isActive("/login") ? styles.active : ""}
              >
                Login
              </Link>

              <Link
                href="/signup"
                onClick={closeMenu}
                className={styles.signupButton}
              >
                Sign up
              </Link>
            </>
          )}

          {signedIn && authReady && (
            <>
              {role === "admin" ? (
                <Link
                  href="/admin/dashboard"
                  onClick={closeMenu}
                  className={`${styles.dashboardButton} ${
                    isActive("/admin/dashboard")
                      ? styles.dashboardActive
                      : ""
                  }`}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/books"
                    onClick={closeMenu}
                    className={isActive("/books") ? styles.active : ""}
                  >
                    Books
                  </Link>

                  <Link
                    href="/cart"
                    onClick={closeMenu}
                    className={isActive("/cart") ? styles.active : ""}
                  >
                    Cart
                    {totalItems > 0 && (
                      <span
                        className={styles.cartCount}
                        aria-label={`${totalItems} items in cart`}
                      >
                        {totalItems}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/orders"
                    onClick={closeMenu}
                    className={isActive("/orders") ? styles.active : ""}
                  >
                    My Orders
                  </Link>

                  <Link
                    href="/wishlist"
                    onClick={closeMenu}
                    className={isActive("/wishlist") ? styles.active : ""}
                  >
                    Wishlist
                  </Link>

                  {role === "seller" && (
                    <Link
                      href="/seller/dashboard"
                      onClick={closeMenu}
                      className={`${styles.dashboardButton} ${
                        isActive("/seller/dashboard")
                          ? styles.dashboardActive
                          : ""
                      }`}
                    >
                      Dashboard
                    </Link>
                  )}
                </>
              )}

              <Link
                href="/profile"
                onClick={closeMenu}
                className={`${styles.profileLink} ${
                  isActive("/profile") ? styles.profileActive : ""
                }`}
                aria-label="Open your profile"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt=""
                    className={styles.profileAvatar}
                  />
                ) : (
                  <span className={styles.profileAvatarFallback}>
                    {profileName.charAt(0).toUpperCase()}
                  </span>
                )}

                <span className={styles.profileName}>
                  {profileName}
                </span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
