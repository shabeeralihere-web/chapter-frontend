
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

export default function AdminLayout({ children }) {
  const router = useRouter();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const authReady = initialized && !restoring;
  const isAuthenticated = Boolean(accessToken && user);
  const isAdmin = user?.role === "admin";

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

  // Do not render admin pages until authorization is confirmed.
  if (!authReady || !isAuthenticated || !isAdmin) {
    return (
      <main
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          color: "#352c25",
        }}
      >
        <strong style={{ fontSize: "24px" }}>Chapter.</strong>
        <p>Verifying administrator access…</p>
      </main>
    );
  }

  return children;
}
