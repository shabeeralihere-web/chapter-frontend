
"use client";

import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { store } from "@/store/store";
import { restoreSession } from "@/store/auth/authSlice";

function AuthInitializer({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  return children;
}

export default function ReduxProvider({ children }) {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}
