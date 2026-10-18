"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";

import { signupSchema } from "@/lib/validation/authSchemas";
import { getDashboardPath } from "@/lib/authRedirect";
import {
  clearAuthError,
  registerUser,
  setCredentials,
} from "@/store/auth/authSlice";
import { restoreSession } from "@/store/auth/authSlice";
import api from "@/lib/axios";
import styles from "./signup.module.css";

export default function SignupPage() {
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountType: "reader",
      sellerReason: "",
    },
  });

  const accountType = watch("accountType");

  // Restore a saved session if authentication has not been initialized.
  useEffect(() => {
    if (!initialized && !restoring) {
      dispatch(restoreSession());
    }
  }, [initialized, restoring, dispatch]);

  // Authenticated users should not remain on the signup page.
  useEffect(() => {
    if (!initialized || restoring) return;

    if (user && accessToken) {
      router.replace(getDashboardPath(user));
    }
  }, [initialized, restoring, user, accessToken, router]);

  async function onSubmit(values) {
    dispatch(clearAuthError());

    try {
      const result = await dispatch(registerUser(values)).unwrap();

      if (!result?.accessToken || !result?.user) {
        toast.error(
          "Account created, but the login session could not be started. Please sign in."
        );
        router.replace("/login?registered=true");
        return;
      }

      // Save the authentication session.
      localStorage.setItem("accessToken", result.accessToken);

      dispatch(
        setCredentials({
          accessToken: result.accessToken,
          user: result.user,
        })
      );

      if (values.accountType === "seller") {
        try {
          await api.post("/sellers/applications", {
            reason: values.sellerReason?.trim() || "",
          });

          toast.success(
            "Account created! Your seller application is pending review."
          );
        } catch (applicationError) {
          toast.error(
            applicationError.response?.data?.message ||
              "Your account was created, but the application could not be submitted. You can retry on the seller application page."
          );
        }

        router.replace("/seller/apply");
        return;
      }

      toast.success("Welcome to Chapter!");
      router.replace(getDashboardPath(result.user));
    } catch {
      // Registration errors are displayed using Redux state.
    }
  }

  // Wait until session restoration finishes before showing signup.
  if (!initialized || restoring || (user && accessToken)) {
    return null;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>YOUR NEXT CHAPTER STARTS HERE</p>

          <h1 className={styles.title}>Create your account</h1>

          <p className={styles.description}>
            Join a community of readers, discover great books, and find your
            next read.
          </p>
        </header>

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
          <fieldset className={styles.accountFieldset}>
            <legend className={styles.label}>Choose your account type</legend>

            <div className={styles.accountOptions}>
              <label
                className={`${styles.accountOption} ${
                  accountType === "reader" ? styles.accountOptionActive : ""
                }`}
              >
                <input
                  type="radio"
                  value="reader"
                  {...register("accountType")}
                />

                <span className={styles.optionTitle}>Reader</span>
                <span className={styles.optionDescription}>
                  Discover and enjoy books.
                </span>
              </label>

              <label
                className={`${styles.accountOption} ${
                  accountType === "seller" ? styles.accountOptionActive : ""
                }`}
              >
                <input
                  type="radio"
                  value="seller"
                  {...register("accountType")}
                />

                <span className={styles.optionTitle}>Seller</span>
                <span className={styles.optionDescription}>
                  Apply to list books on Chapter.
                </span>
              </label>
            </div>

            {errors.accountType && (
              <p className={styles.error}>{errors.accountType.message}</p>
            )}
          </fieldset>

          {accountType === "seller" && (
            <section className={styles.sellerNotice}>
              <h2>Seller verification required</h2>

              <p>
                Your application will be reviewed by the admin team. Seller
                tools become available after approval.
              </p>

              <label className={styles.label} htmlFor="sellerReason">
                Tell us about the books you plan to sell
                <span className={styles.optional}> (optional)</span>
              </label>

              <textarea
                id="sellerReason"
                rows={3}
                maxLength={500}
                placeholder="For example, fiction, educational books, or used books..."
                className={styles.input}
                {...register("sellerReason")}
              />

              {errors.sellerReason && (
                <p className={styles.error}>
                  {errors.sellerReason.message}
                </p>
              )}

              <p className={styles.helperText}>Maximum 500 characters.</p>
            </section>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Full name
            </label>

            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              className={`${styles.input} ${
                errors.name ? styles.inputError : ""
              }`}
              {...register("name")}
              aria-invalid={Boolean(errors.name)}
            />

            {errors.name && (
              <p className={styles.error}>{errors.name.message}</p>
            )}
          </div>

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
              aria-invalid={Boolean(errors.email)}
            />

            {errors.email && (
              <p className={styles.error}>{errors.email.message}</p>
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
                autoComplete="new-password"
                placeholder="Create a password"
                className={`${styles.input} ${
                  errors.password ? styles.inputError : ""
                }`}
                {...register("password")}
                aria-invalid={Boolean(errors.password)}
              />

              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {errors.password && (
              <p className={styles.error}>{errors.password.message}</p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">
              Confirm password
            </label>

            <div className={styles.passwordWrap}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter your password again"
                className={`${styles.input} ${
                  errors.confirmPassword ? styles.inputError : ""
                }`}
                {...register("confirmPassword")}
                aria-invalid={Boolean(errors.confirmPassword)}
              />

              <button
                type="button"
                className={styles.togglePassword}
                onClick={() =>
                  setShowConfirmPassword((visible) => !visible)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            {errors.confirmPassword && (
              <p className={styles.error}>
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            className={styles.submitButton}
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : accountType === "seller"
                ? "Create account & apply"
                : "Create account"}

            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>

        <p className={styles.terms}>
          By creating an account, you agree to use Chapter responsibly and
          respectfully.
        </p>
      </section>

      <p className={styles.bottomNote}>
        A little reading can change a lot.
      </p>
    </main>
  );
}