
"use client";

import { useState } from "react";
import styles from "./contact.module.css";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General enquiry",
    message: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const supportEmail = "support@example.com";

    const subject = encodeURIComponent(
      `Chapter. — ${formData.subject}`
    );

    const body = encodeURIComponent(
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n\n` +
      `Subject: ${formData.subject}\n\n` +
      `Message:\n${formData.message}`
    );

    window.location.href =
      `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <main className={styles.contact} id="top">
      <div className={styles.content}>
        <section className={styles.intro}>
          <p className={styles.eyebrow}>
            FOR THE LOVE OF READING
          </p>

          <h1>
            Let&apos;s talk<span>.</span>
          </h1>

          <p className={styles.description}>
            Have a question about a book, an order, or
            anything else? We&apos;re here to help.
            Every good conversation starts somewhere.
          </p>

          <div className={styles.directContact}>
            <span className={styles.directLabel}>
              PREFER EMAIL?
            </span>

            <a href="mailto:support@example.com">
              support@example.com
              <span aria-hidden="true"> ↗</span>
            </a>
          </div>

          <p className={styles.sideNote}>
            STORIES. IDEAS. CONVERSATIONS.
          </p>
        </section>

        <section className={styles.formSection}>
          <div className={styles.formHeading}>
            <p className={styles.formEyebrow}>
              GET IN TOUCH
            </p>

            <h2>How can we help?</h2>

            <p>
              Send us a message and tell us what&apos;s on your mind.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="name">YOUR NAME</label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your name"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="email">EMAIL ADDRESS</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={254}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="subject">SUBJECT</label>

              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
              >
                <option>General enquiry</option>
                <option>Order enquiry</option>
                <option>Book enquiry</option>
                <option>Payment issue</option>
                <option>Returns and refunds</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="message">YOUR MESSAGE</label>

              <textarea
                id="message"
                name="message"
                placeholder="Write your message here..."
                rows={5}
                minLength={10}
                maxLength={3000}
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>

            <button
              className={styles.submitButton}
              type="submit"
            >
              <span>SEND MESSAGE</span>
              <span className={styles.buttonArrow} aria-hidden="true">
                ↗
              </span>
            </button>

            <p className={styles.formNote}>
              Thank you for being part of our reading community.
            </p>
          </form>
        </section>
      </div>

      <div className={styles.bottomLine}>
        <span>CHAPTER. — A WORLD BEYOND THE ORDINARY</span>
        <span>01 / CONTACT</span>
      </div>
    </main>
  );
}
