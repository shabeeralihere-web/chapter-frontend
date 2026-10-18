
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import "../../auth-pages.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();

  const token = params.token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/reset-password/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to reset password. Please try again."
        );
      }

      setMessage(
        data.message || "Password reset successfully. Redirecting to login..."
      );

      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);

      setTimeout(() => {
        router.push("/login");
      }, 1800);
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Reset password</h1>

        <p>
          Create a new password for your account. Use at least 8 characters.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="password">New password</label>

          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter new password"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <label htmlFor="confirmPassword">Confirm password</label>

          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <label className="show-password-option">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            Show password
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Resetting password..." : "Reset password"}
          </button>
        </form>

        {message && <p role="status">{message}</p>}

        {error && <p role="alert">{error}</p>}

        <p>
          Remember your password? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
