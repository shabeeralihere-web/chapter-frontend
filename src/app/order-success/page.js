
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "@/lib/axios";
import styles from "./order-success.module.css";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
}

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!user || !accessToken) {
      router.replace(
        `/login?redirect=${encodeURIComponent(
          `/order-success?orderId=${orderId || ""}`
        )}`
      );
      return;
    }

    if (user.role === "admin") {
      router.replace("/");
      return;
    }

    if (!orderId) {
      setError("We couldn't find an order ID in this link.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/orders/${encodeURIComponent(orderId)}`
        );

        const result = response.data?.data ?? response.data;

        if (!result?._id) {
          throw new Error("The order details could not be found.");
        }

        if (!cancelled) {
          setOrder(result);
        }
      } catch (err) {
        if (cancelled) return;

        const status = err.response?.status;

        if (status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(
              `/order-success?orderId=${orderId}`
            )}`
          );
          return;
        }

        const message =
          err.response?.data?.message ||
          err.message ||
          "Unable to load your order details.";

        setError(message);
        toast.error("Unable to load order details");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [
    initialized,
    restoring,
    user,
    accessToken,
    orderId,
    router,
  ]);

  if (!initialized || restoring || loading) {
    return (
      <main className={styles.page}>
        <div className={styles.message}>
          <span className={styles.spinner} />
          <h1>Checking your order...</h1>
          <p>Please wait while we retrieve your order details.</p>
        </div>
      </main>
    );
  }

  if (!user || user.role === "admin") {
    return null;
  }

  if (error || !order) {
    return (
      <main className={styles.page}>
        <section className={styles.message}>
          <div className={styles.errorIcon}>!</div>
          <h1>Order details unavailable</h1>
          <p>{error || "We couldn't find this order."}</p>

          <div className={styles.actions}>
            <Link href="/orders" className={styles.primaryButton}>
              View my orders
            </Link>
            <Link href="/books" className={styles.secondaryButton}>
              Browse books
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const shippingAddress = order.shippingAddress || {};

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.successIcon}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m5 12 4 4L19 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className={styles.eyebrow}>THANK YOU FOR YOUR ORDER</p>
          <h1>Your next chapter starts here.</h1>
          <p className={styles.description}>
            Your order has been successfully placed. We’re getting
            your books ready.
          </p>

          <div className={styles.orderReference}>
            <span>Order ID</span>
            <strong>{order._id}</strong>
          </div>

          <span className={styles.status}>
            {String(order.orderStatus || "placed").replaceAll(
              "_",
              " "
            )}
          </span>
        </section>

        <div className={styles.content}>
          <section className={styles.card}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>YOUR PURCHASE</p>
                <h2>Order summary</h2>
              </div>
              <span className={styles.itemCount}>
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>

            <div className={styles.items}>
              {items.map((item, index) => (
                <div
                  className={styles.item}
                  key={item._id || item.book || index}
                >
                  <div className={styles.bookCover}>
                    {item.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.coverImage} alt={item.title} />
                    ) : (
                      <span>Chapter.</span>
                    )}
                  </div>

                  <div className={styles.bookInfo}>
                    <h3>{item.title || "Book"}</h3>
                    <p>{item.author || "Unknown author"}</p>
                    <span>Quantity: {item.quantity}</span>
                  </div>

                  <strong className={styles.itemPrice}>
                    {formatPrice(
                      Number(item.price || 0) *
                        Number(item.quantity || 0)
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div className={styles.totalRow}>
              <span>Order total</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrow}>DELIVERY DETAILS</p>
            <h2>Shipping address</h2>

            <div className={styles.address}>
              <strong>{shippingAddress.fullName}</strong>
              <p>{shippingAddress.phone}</p>
              <p>{shippingAddress.addressLine1}</p>
              {shippingAddress.addressLine2 && (
                <p>{shippingAddress.addressLine2}</p>
              )}
              <p>
                {[
                  shippingAddress.city,
                  shippingAddress.state,
                  shippingAddress.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>{shippingAddress.country}</p>
            </div>

            <div className={styles.paymentInfo}>
              <span>Payment method</span>
              <strong>
                {String(order.paymentMethod || "cod").toUpperCase()}
              </strong>
            </div>

            <p className={styles.paymentNote}>
              {order.paymentStatus === "paid"
                ? "Payment received."
                : "Payment is pending. For Cash on Delivery, pay when your order arrives."}
            </p>
          </section>
        </div>

        <div className={styles.bottomActions}>
          <Link href="/orders" className={styles.primaryButton}>
            View my orders
          </Link>
          <Link href="/books" className={styles.secondaryButton}>
            Continue shopping
          </Link>
        </div>

        <p className={styles.footerNote}>
          Every book opens a new chapter. Happy reading!
        </p>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.message}>
            <span className={styles.spinner} />
            <h1>Loading your order...</h1>
          </div>
        </main>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
