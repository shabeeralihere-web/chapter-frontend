
"use client";
import "../auth-pages.css";
import { useState } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send reset email");
      }

      setMessage(
        data.message ||
          "If an account exists with this email, a reset link will be sent."
      );
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Forgot password?</h1>
        <p>
          Enter the email address associated with your account.
          We will send you a password reset link if an account exists.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
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
