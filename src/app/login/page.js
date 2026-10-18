"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginSchema } from "@/lib/validation/authSchemas";
import { getDashboardPath } from "@/lib/authRedirect";
import {
  clearAuthError,
  loginUser,
} from "@/store/auth/authSlice";
import styles from "./login.module.css";

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const {
    user,
    accessToken,
    initialized,
    restoring,
    loading,
    error,
  } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    setRegistered(
      new URLSearchParams(window.location.search).get("registered") === "true"
    );
  }, []);

  // Redirect users who already have a restored session.
  useEffect(() => {
    if (!initialized || restoring) return;

    if (user && accessToken) {
      router.replace(getDashboardPath(user));
    }
  }, [initialized, restoring, user, accessToken, router]);

  async function onSubmit(values) {
    dispatch(clearAuthError());

    try {
      const result = await dispatch(loginUser(values)).unwrap();

      if (result?.user) {
        router.replace(getDashboardPath(result.user));
      } else {
        // Login succeeded, but no user profile was returned.
        // The session restoration endpoint must provide the profile.
        router.replace("/books");
      }
    } catch {
      // The backend error is displayed from Redux state.
    }
  }

  // Avoid displaying the login form while checking a saved session.
  if (!initialized || restoring || (user && accessToken)) {
    return null;
  }

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand}>
        Chapter<span>.</span>
      </Link>

      <section className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          ↗
        </div>

        <p className={styles.eyebrow}>WELCOME BACK</p>

        <h1 className={styles.title}>
          Your next chapter awaits.
        </h1>

        <p className={styles.description}>
          Sign in to continue discovering books, ideas, and new perspectives.
        </p>

        {registered && (
          <div className={styles.success} role="status">
            Your account was created. You can now sign in.
          </div>
        )}

        {error && (
          <div className={styles.alert} role="alert">
            {error}
          </div>
        )}

        <form
          className={styles.form}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`${styles.input} ${
                errors.email ? styles.inputError : ""
              }`}
              {...register("email")}
            />

            {errors.email && (
              <p className={styles.error}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>

            <div className={styles.passwordWrap}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`${styles.input} ${
                  errors.password ? styles.inputError : ""
                }`}
                {...register("password")}
              />

              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {errors.password && (
              <p className={styles.error}>
                {errors.password.message}
              </p>
            )}
          </div>

          <p>
            <Link href="/forgot-password">
              Forgot password?
            </Link>
          </p>

          <button
            className={styles.submitButton}
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className={styles.footer}>
          New to Chapter?{" "}
          <Link href="/signup" className={styles.link}>
            Create an account
          </Link>
        </p>

        <Link href="/books" className={styles.browseLink}>
          Explore books without signing in
        </Link>
      </section>

      <p className={styles.bottomNote}>
        Make room for a new perspective.
      </p>
    </main>
  );
}