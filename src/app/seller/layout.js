
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";

export default function SellerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const authReady = initialized && !restoring;
  const isAuthenticated = Boolean(accessToken && user);

  // Allow readers to access the seller application page.
  const isApplicationPage = pathname === "/seller/apply";

  const isApprovedSeller =
    user?.role === "seller" &&
    user?.sellerApplicationStatus === "approved";

  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // The application page is available to logged-in non-admin users.
    if (isApplicationPage) {
      if (user?.role === "admin") {
        router.replace("/admin/dashboard");
      }
      return;
    }

    // All other seller pages require approval.
    if (!isApprovedSeller) {
      router.replace("/unauthorized");
    }
  }, [
    authReady,
    isAuthenticated,
    isApplicationPage,
    isApprovedSeller,
    user,
    router,
  ]);

  if (
    !authReady ||
    !isAuthenticated ||
    (isApplicationPage
      ? user?.role === "admin"
      : !isApprovedSeller)
  ) {
    return (
      <main
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#352c25",
        }}
      >
        <p>Checking account permissions...</p>
      </main>
    );
  }

  return children;
}
