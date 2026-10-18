"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { restoreSession } from "@/store/auth/authSlice";
import { getDashboardPath } from "@/lib/authRedirect";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const router = useRouter();
  const dispatch = useDispatch();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (!initialized && !restoring) {
      dispatch(restoreSession());
    }
  }, [initialized, restoring, dispatch]);

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!user || !accessToken) {
      router.replace("/login");
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      router.replace("/unauthorized");
    }
  }, [
    initialized,
    restoring,
    user,
    accessToken,
    allowedRoles,
    router,
  ]);

  if (!initialized || restoring || !user || !accessToken) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
}