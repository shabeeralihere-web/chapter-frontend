"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { restoreSession } from "@/store/auth/authSlice";
import { getDashboardPath } from "@/lib/authRedirect";

export default function GuestOnly({ children }) {
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

    if (user && accessToken) {
      router.replace(getDashboardPath(user));
    }
  }, [initialized, restoring, user, accessToken, router]);

  if (!initialized || restoring || (user && accessToken)) {
    return null;
  }

  return children;
}