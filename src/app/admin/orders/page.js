
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import styles from "./orders.module.css";

const PAGE_SIZE = 8;

const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

const NEXT_STATUSES = {
  placed: ["confirmed"],
  confirmed: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLabel(value) {
  if (!value) return "Unknown";

  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function getCustomerName(order) {
  return order?.user?.name || "Unknown customer";
}

function getCustomerEmail(order) {
  return order?.user?.email || "No email available";
}

function getOrderNumber(order) {
  return order?.orderNumber || order?._id || "Unknown order";
}

function getOrderItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function getItemCount(order) {
  return getOrderItems(order).reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0
  );
}

function getShippingAddress(order) {
  const address = order?.shippingAddress;

  if (!address) return [];

  if (typeof address === "string") return [address];

  return [
    address.fullName || address.name,
    address.phone,
    address.addressLine1 || address.addressLine,
    address.addressLine2,
    [address.city, address.state, address.postalCode || address.pincode]
      .filter(Boolean)
      .join(", "),
    address.country,
  ].filter(Boolean);
}

function StatusBadge({ status, type = "order" }) {
  const safeStatus = status || "unknown";

  return (
    <span
      className={`${styles.badge} ${
        type === "payment" ? styles.paymentBadge : ""
      } ${styles[`status_${safeStatus}`] || styles.status_unknown}`}
    >
      {formatLabel(safeStatus)}
    </span>
  );
}

function SummaryCard({ label, value, description }) {
  return (
    <div className={styles.summaryCard}>
      <p className={styles.summaryLabel}>{label}</p>
      <p className={styles.summaryValue}>{value}</p>
      <p className={styles.summaryDescription}>{description}</p>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await api.get("/orders/admin/all");
      const fetchedOrders = response.data?.data;

      if (!Array.isArray(fetchedOrders)) {
        throw new Error("The server returned an unexpected orders response.");
      }

      setOrders(fetchedOrders);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          order.orderNumber,
          order._id,
          order.user?.name,
          order.user?.email,
        ].some((value) =>
          String(value || "").toLowerCase().includes(normalizedSearch)
        );

      const matchesStatus =
        statusFilter === "all" || order.orderStatus === statusFilter;

      const matchesPayment =
        paymentFilter === "all" || order.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const summary = useMemo(
    () => ({
      total: orders.length,
      placed: orders.filter((order) => order.orderStatus === "placed").length,
      processing: orders.filter((order) =>
        ["confirmed", "processing"].includes(order.orderStatus)
      ).length,
      delivered: orders.filter(
        (order) => order.orderStatus === "delivered"
      ).length,
    }),
    [orders]
  );

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setCurrentPage(1);
  }

  async function handleStatusUpdate(order, nextStatus) {
    const orderId = order?._id;

    if (
      !orderId ||
      !NEXT_STATUSES[order.orderStatus]?.includes(nextStatus)
    ) {
      setActionError("This status transition is not allowed.");
      return;
    }

    setUpdatingOrderId(orderId);
    setActionError("");

    try {
      await api.patch(`/orders/admin/${orderId}/status`, {
        status: nextStatus,
      });

      await fetchOrders();
      setExpandedOrderId(orderId);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div>
            <Link href="/admin/dashboard" className={styles.backLink}>
              <span aria-hidden="true">←</span> Admin dashboard
            </Link>

            <p className={styles.eyebrow}>ORDER MANAGEMENT</p>
            <h1 className={styles.title}>Orders</h1>
            <p className={styles.subtitle}>
              Review customer purchases and manage order fulfilment.
            </p>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={fetchOrders}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Refreshing..." : "Refresh orders"}
          </button>
        </header>

        <section className={styles.summaryGrid} aria-label="Order summary">
          <SummaryCard
            label="Total orders"
            value={summary.total}
            description="All orders received"
          />
          <SummaryCard
            label="New orders"
            value={summary.placed}
            description="Awaiting confirmation"
          />
          <SummaryCard
            label="In progress"
            value={summary.processing}
            description="Confirmed or processing"
          />
          <SummaryCard
            label="Delivered"
            value={summary.delivered}
            description="Successfully delivered"
          />
        </section>

        {actionError && (
          <div className={styles.errorBanner} role="alert">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <section className={styles.ordersPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>All orders</h2>
              <p>
                {loading
                  ? "Loading orders..."
                  : `${filteredOrders.length} matching ${
                      filteredOrders.length === 1 ? "order" : "orders"
                    }`}
              </p>
            </div>
          </div>

          <div className={styles.filters}>
            <label className={styles.searchBox}>
              <span className={styles.searchIcon} aria-hidden="true">
                ⌕
              </span>
              <span className={styles.visuallyHidden}>Search orders</span>
              <input
                type="search"
                placeholder="Search order, customer or email..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>

            <label className={styles.filterField}>
              <span>Order status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All statuses</option>
                {ORDER_STATUSES.map((status) => (
                  <option value={status} key={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterField}>
              <span>Payment</span>
              <select
                value={paymentFilter}
                onChange={(event) => {
                  setPaymentFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All payments</option>
                {PAYMENT_STATUSES.map((status) => (
                  <option value={status} key={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={styles.clearButton}
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>

          {loading ? (
            <div className={styles.stateContainer}>
              <div className={styles.spinner} />
              <p>Loading orders...</p>
            </div>
          ) : loadError ? (
            <div className={styles.stateContainer}>
              <div className={styles.stateIcon}>!</div>
              <h3>Couldn&apos;t load orders</h3>
              <p>{loadError}</p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={fetchOrders}
              >
                Try again
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className={styles.stateContainer}>
              <div className={styles.stateIcon}>▤</div>
              <h3>{orders.length ? "No matching orders" : "No orders yet"}</h3>
              <p>
                {orders.length
                  ? "Try changing your search or filters."
                  : "Customer orders will appear here when purchases are made."}
              </p>

              {orders.length > 0 && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.ordersTable}>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedOrders.map((order) => {
                      const orderId = order._id;
                      const isExpanded = expandedOrderId === orderId;
                      const isUpdating = updatingOrderId === orderId;
                      const nextStatuses =
                        NEXT_STATUSES[order.orderStatus] || [];

                      return (
                        <FragmentOrderRow
                          key={orderId}
                          order={order}
                          orderId={orderId}
                          isExpanded={isExpanded}
                          isUpdating={isUpdating}
                          nextStatuses={nextStatuses}
                          onToggle={() =>
                            setExpandedOrderId(
                              isExpanded ? null : orderId
                            )
                          }
                          onStatusUpdate={(status) =>
                            handleStatusUpdate(order, status)
                          }
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.pagination}>
                <p>
                  Showing{" "}
                  <strong>
                    {(safePage - 1) * PAGE_SIZE + 1}–
                    {Math.min(safePage * PAGE_SIZE, filteredOrders.length)}
                  </strong>{" "}
                  of <strong>{filteredOrders.length}</strong>
                </p>

                <div className={styles.paginationControls}>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={safePage <= 1}
                  >
                    Previous
                  </button>

                  <span>
                    Page {safePage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                    disabled={safePage >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <p className={styles.footerNote}>
          Order information is retrieved from your Book Store API.
        </p>
      </div>
    </main>
  );
}

function FragmentOrderRow({
  order,
  orderId,
  isExpanded,
  isUpdating,
  nextStatuses,
  onToggle,
  onStatusUpdate,
}) {
  const items = getOrderItems(order);
  const shippingAddress = getShippingAddress(order);

  return (
    <>
      <tr className={isExpanded ? styles.expandedRow : ""}>
        <td>
          <div className={styles.orderCell}>
            <span className={styles.orderNumber}>
              #{getOrderNumber(order)}
            </span>
            <span className={styles.orderId}>
              ID: {String(orderId).slice(-8)}
            </span>
          </div>
        </td>

        <td>
          <div className={styles.customerCell}>
            <span className={styles.customerName}>
              {getCustomerName(order)}
            </span>
            <span className={styles.customerEmail}>
              {getCustomerEmail(order)}
            </span>
          </div>
        </td>

        <td className={styles.dateCell}>{formatDate(order.createdAt)}</td>
        <td>{getItemCount(order)}</td>

        <td className={styles.amountCell}>
          {formatCurrency(order.totalAmount)}
        </td>

        <td>
          <div className={styles.paymentCell}>
            <span>{formatLabel(order.paymentMethod || "unknown")}</span>
            <StatusBadge status={order.paymentStatus} type="payment" />
          </div>
        </td>

        <td>
          <StatusBadge status={order.orderStatus} />
        </td>

        <td>
          <button
            type="button"
            className={styles.detailsButton}
            onClick={onToggle}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Hide" : "View"}
            <span aria-hidden="true">{isExpanded ? " −" : " +"}</span>
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr className={styles.detailsRow}>
          <td colSpan={8}>
            <div className={styles.detailsPanel}>
              <div className={styles.detailsHeader}>
                <div>
                  <p className={styles.eyebrow}>ORDER DETAILS</p>
                  <h3>#{getOrderNumber(order)}</h3>
                  <p className={styles.detailsDate}>
                    Placed on {formatDate(order.createdAt)}
                  </p>
                </div>

                <StatusBadge status={order.orderStatus} />
              </div>

              <div className={styles.detailsGrid}>
                <section className={styles.detailCard}>
                  <h4>Customer</h4>
                  <p className={styles.detailStrong}>
                    {getCustomerName(order)}
                  </p>
                  <p>{getCustomerEmail(order)}</p>
                </section>

                <section className={styles.detailCard}>
                  <h4>Shipping address</h4>
                  {shippingAddress.length ? (
                    shippingAddress.map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))
                  ) : (
                    <p>No shipping address available.</p>
                  )}
                </section>

                <section className={styles.detailCard}>
                  <h4>Payment</h4>
                  <p>
                    Method: {formatLabel(order.paymentMethod || "unknown")}
                  </p>
                  <p>
                    Status: {formatLabel(order.paymentStatus || "unknown")}
                  </p>
                </section>
              </div>

              <section className={styles.itemsSection}>
                <h4>Books in this order</h4>

                {items.length ? (
                  <div className={styles.itemList}>
                    {items.map((item, index) => (
                      <div
                        className={styles.itemRow}
                        key={`${item.book || item.title || "item"}-${index}`}
                      >
                        <div className={styles.bookMark} aria-hidden="true">
                          ▤
                        </div>

                        <div className={styles.itemInfo}>
                          <p className={styles.detailStrong}>
                            {item.title || "Untitled book"}
                          </p>
                          <p>{item.author || "Unknown author"}</p>
                          <p>Quantity: {Number(item.quantity) || 0}</p>
                        </div>

                        <div className={styles.itemPrice}>
                          <span>
                            {formatCurrency(item.price)} ×{" "}
                            {Number(item.quantity) || 0}
                          </span>
                          <strong>
                            {formatCurrency(
                              (Number(item.price) || 0) *
                                (Number(item.quantity) || 0)
                            )}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No item details available.</p>
                )}
              </section>

              <div className={styles.detailsBottom}>
                <div className={styles.orderTotals}>
                  <p>
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </p>
                  <p>
                    <span>Shipping</span>
                    <span>{formatCurrency(order.shippingFee)}</span>
                  </p>
                  <p className={styles.grandTotal}>
                    <span>Total</span>
                    <strong>{formatCurrency(order.totalAmount)}</strong>
                  </p>
                </div>

                <section className={styles.statusActions}>
                  <h4>Manage order</h4>

                  {nextStatuses.length > 0 ? (
                    <>
                      <p>
                        Current status:{" "}
                        <strong>{formatLabel(order.orderStatus)}</strong>
                      </p>

                      <div className={styles.actionButtons}>
                        {nextStatuses.map((status) => (
                          <button
                            type="button"
                            key={status}
                            className={styles.primaryButton}
                            disabled={isUpdating}
                            onClick={() => onStatusUpdate(status)}
                          >
                            {isUpdating
                              ? "Updating..."
                              : `Mark as ${formatLabel(status)}`}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className={styles.terminalNote}>
                      This order has reached its final status.
                    </p>
                  )}
                </section>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
