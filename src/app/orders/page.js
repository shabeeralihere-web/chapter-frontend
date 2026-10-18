
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import api from "@/lib/axios";
import { fetchCart } from "@/store/cart/cartThunks";
import styles from "./orders.module.css";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status) {
  const normalized = String(status || "placed")
    .toLowerCase()
    .replaceAll("_", "-");

  if (normalized === "delivered") return styles.statusDelivered;
  if (normalized === "cancelled") return styles.statusCancelled;
  if (normalized === "shipped") return styles.statusShipped;
  if (normalized === "processing") return styles.statusProcessing;

  return styles.statusDefault;
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export default function MyOrdersPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await api.get("/orders");
      const result = response.data?.data ?? response.data;

      if (!Array.isArray(result)) {
        throw new Error("The server returned an unexpected orders response.");
      }

      setOrders(result);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!user || !accessToken) {
      router.replace("/login?redirect=/orders");
      return;
    }

    if (user.role === "admin") {
      router.replace("/");
      return;
    }

    loadOrders();
  }, [
    initialized,
    restoring,
    user,
    accessToken,
    router,
    loadOrders,
  ]);

  async function handleCancelOrder(order) {
    if (cancellingId) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel order ${order._id}?`
    );

    if (!confirmed) return;

    setCancellingId(order._id);

    try {
      const response = await api.patch(
        `/orders/${encodeURIComponent(order._id)}/cancel`
      );

      const updatedOrder = response.data?.data;

      if (updatedOrder?._id) {
        setOrders((currentOrders) =>
          currentOrders.map((currentOrder) =>
            currentOrder._id === updatedOrder._id
              ? updatedOrder
              : currentOrder
          )
        );
      } else {
        await loadOrders();
      }

      // The backend restores stock when an order is cancelled.
      // Refreshing the cart ensures any changed stock is reflected
      // in the rest of the shopping experience.
      await dispatch(fetchCart());

      toast.success("Order cancelled successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
      await loadOrders();
    } finally {
      setCancellingId(null);
    }
  }

  if (!initialized || restoring || loading) {
    return (
      <main className={styles.page}>
        <div className={styles.message}>
          <span className={styles.spinner} />
          <h1>Loading your orders...</h1>
          <p>Please wait while we retrieve your purchase history.</p>
        </div>
      </main>
    );
  }

  if (!user || user.role === "admin") {
    return null;
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>YOUR CHAPTERS</p>
            <h1>My Orders</h1>
            <p className={styles.subtitle}>
              Keep track of the books you have ordered.
            </p>
          </div>

          <Link href="/books" className={styles.shopButton}>
            Browse books
          </Link>
        </header>

        {pageError ? (
          <section className={styles.emptyState}>
            <h2>We couldn't load your orders</h2>
            <p>{pageError}</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={loadOrders}
            >
              Try again
            </button>
          </section>
        ) : orders.length === 0 ? (
          <section className={styles.emptyState}>
            <div className={styles.emptyIcon}>C.</div>
            <h2>Your story starts with a book.</h2>
            <p>
              You haven't placed any orders yet. Find your next
              favorite read in our bookstore.
            </p>
            <Link href="/books" className={styles.primaryButton}>
              Explore books
            </Link>
          </section>
        ) : (
          <div className={styles.orderList}>
            {orders.map((order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              const status = String(order.orderStatus || "placed")
                .toLowerCase()
                .replaceAll("_", " ");

              const canCancel =
                order.orderStatus === "placed" &&
                order.paymentStatus !== "paid";

              return (
                <article className={styles.orderCard} key={order._id}>
                  <div className={styles.orderHeader}>
                    <div className={styles.orderMeta}>
                      <span>ORDER PLACED</span>
                      <strong>{formatDate(order.createdAt)}</strong>
                    </div>

                    <div className={styles.orderMeta}>
                      <span>ORDER TOTAL</span>
                      <strong>{formatPrice(order.totalAmount)}</strong>
                    </div>

                    <div className={styles.orderMeta}>
                      <span>ORDER ID</span>
                      <strong className={styles.orderId}>
                        {order._id}
                      </strong>
                    </div>

                    <span
                      className={`${styles.status} ${getStatusClass(
                        order.orderStatus
                      )}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className={styles.orderBody}>
                    <div className={styles.itemList}>
                      {items.map((item, index) => (
                        <div
                          className={styles.item}
                          key={item._id || item.book || index}
                        >
                          <div className={styles.bookCover}>
                            {item.coverImage ? (
                              // eslint-disable-next-line
                              // @next/next/no-img-element
                              <img
                                src={item.coverImage}
                                alt={item.title || "Book cover"}
                              />
                            ) : (
                              <span>Chapter.</span>
                            )}
                          </div>

                          <div className={styles.itemInfo}>
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

                    <aside className={styles.orderActions}>
                      <div className={styles.paymentRow}>
                        <span>Payment</span>
                        <strong>
                          {String(order.paymentMethod || "cod").toUpperCase()}
                        </strong>
                      </div>

                      <div className={styles.paymentRow}>
                        <span>Payment status</span>
                        <strong>
                          {String(
                            order.paymentStatus || "pending"
                          ).replaceAll("_", " ")}
                        </strong>
                      </div>

                      {canCancel && (
                        <button
                          type="button"
                          className={styles.cancelButton}
                          disabled={Boolean(cancellingId)}
                          onClick={() => handleCancelOrder(order)}
                        >
                          {cancellingId === order._id
                            ? "Cancelling..."
                            : "Cancel order"}
                        </button>
                      )}

                      {order.orderStatus === "cancelled" && (
                        <p className={styles.cancelledNote}>
                          This order has been cancelled.
                        </p>
                      )}

                      {order.orderStatus === "delivered" && (
                        <p className={styles.deliveredNote}>
                          We hope you enjoy your books!
                        </p>
                      )}
                    </aside>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
