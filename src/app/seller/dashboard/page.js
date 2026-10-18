
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import api from "@/lib/axios";
import styles from "./dashboard.module.css";

const NEXT_STATUS = {
  placed: "confirmed",
  confirmed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

const STATUS_LABELS = {
  placed: "New order",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getInventoryPayload(response) {
  const payload = unwrapResponse(response);

  return {
    books: Array.isArray(payload)
      ? payload
      : payload.books ?? [],
    summary: payload.summary ?? response?.data?.summary ?? {},
  };
}

function getOrdersPayload(response) {
  const payload = unwrapResponse(response);

  return Array.isArray(payload)
    ? payload
    : payload.orders ?? [];
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id ?? value.id ?? "";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status) {
  return (
    STATUS_LABELS[status] ??
    String(status ?? "Unknown").replaceAll("_", " ")
  );
}

function getItemStatus(item) {
  return item.fulfillmentStatus ?? item.status ?? "placed";
}

function getStockLabel(stock) {
  if (Number(stock) <= 0) return "Out of stock";
  if (Number(stock) <= 5) return "Low stock";
  return "In stock";
}

function getStockClass(stock) {
  if (Number(stock) <= 0) return styles.stockOut;
  if (Number(stock) <= 5) return styles.stockLow;
  return styles.stockGood;
}

function getAddressLines(address = {}) {
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
}

export default function SellerDashboardPage() {
  const router = useRouter();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [application, setApplication] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [books, setBooks] = useState([]);
  const [inventorySummary, setInventorySummary] = useState({});
  const [orders, setOrders] = useState([]);

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [updatingItem, setUpdatingItem] = useState("");

  const [activeTab, setActiveTab] = useState("overview");
  const [bookSearch, setBookSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");

  const isApproved =
    application?.role === "seller" ||
    application?.status === "approved";

  const loadApplication = useCallback(async () => {
    try {
      const response = await api.get("/sellers/applications/me");
      const data = unwrapResponse(response);

      setApplication({
        role: data.role,
        status: data.status ?? "none",
        reason: data.reason ?? "",
        appliedAt: data.appliedAt ?? null,
        reviewedAt: data.reviewedAt ?? null,
      });

      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setApplicationLoading(false);
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true);
    setWorkspaceError("");

    try {
      const [inventoryResponse, ordersResponse] = await Promise.all([
        api.get("/orders/seller/inventory"),
        api.get("/orders/seller/orders"),
      ]);

      const inventory = getInventoryPayload(inventoryResponse);
      const sellerOrders = getOrdersPayload(ordersResponse);

      setBooks(inventory.books);
      setInventorySummary(inventory.summary);
      setOrders(sellerOrders);
    } catch (error) {
      const message = getErrorMessage(error);
      setWorkspaceError(message);
      toast.error(message);
    } finally {
      setWorkspaceLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    if (user?.role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }

    loadApplication();
  }, [
    initialized,
    restoring,
    accessToken,
    user?.role,
    router,
    loadApplication,
  ]);

  useEffect(() => {
    if (!isApproved || !accessToken) return;

    loadWorkspace();
  }, [isApproved, accessToken, loadWorkspace]);

  const handleRefresh = async () => {
    setRefreshing(true);

    const applicationLoaded = await loadApplication();

    if (applicationLoaded && isApproved) {
      await loadWorkspace();
    } else {
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (orderId, item, nextStatus) => {
    const bookId = getId(item.book) || item.bookId;
    const itemKey = `${orderId}-${bookId}`;

    if (!orderId || !bookId) {
      toast.error("Unable to identify this order item.");
      return;
    }

    setUpdatingItem(itemKey);

    try {
      await api.patch(
        `/orders/seller/${orderId}/items/${bookId}/status`,
        { status: nextStatus }
      );

      toast.success(`Book marked as ${formatStatus(nextStatus).toLowerCase()}.`);

      // Reload from the server so the UI reflects the saved status.
      await loadWorkspace();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingItem("");
    }
  };

  const filteredBooks = useMemo(() => {
    const search = bookSearch.trim().toLowerCase();

    return books.filter((book) => {
      const matchesSearch =
        !search ||
        [book.title, book.author, book.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));

      const stock = Number(book.stock ?? 0);

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "out" && stock <= 0) ||
        (stockFilter === "low" && stock > 0 && stock <= 5) ||
        (stockFilter === "available" && stock > 5);

      return matchesSearch && matchesStock;
    });
  }, [books, bookSearch, stockFilter]);

  const filteredOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const buyer = order.buyer ?? order.user ?? {};
      const address = order.shippingAddress ?? {};

      const searchableText = [
        order.orderNumber,
        buyer.name,
        buyer.email,
        address.fullName,
        address.phone,
        ...((order.items ?? []).map((item) => item.title)),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || searchableText.includes(search);

      const matchesStatus =
        orderFilter === "all" ||
        (order.items ?? []).some(
          (item) => getItemStatus(item) === orderFilter
        );

      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderFilter]);

  const orderCounts = useMemo(() => {
    const counts = {
      total: 0,
      newOrders: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      (order.items ?? []).forEach((item) => {
        const status = getItemStatus(item);

        counts.total += 1;

        if (status === "placed") counts.newOrders += 1;

        if (["confirmed", "processing"].includes(status)) {
          counts.processing += 1;
        }

        if (status === "shipped") counts.shipped += 1;
        if (status === "delivered") counts.delivered += 1;
        if (status === "cancelled") counts.cancelled += 1;
      });
    });

    return counts;
  }, [orders]);

  if (!initialized || restoring || applicationLoading) {
    return (
      <main className={styles.page}>
        <section className={styles.loadingCard} role="status">
          <span className={styles.spinner} />
          <h1>Loading your dashboard</h1>
          <p>Checking your seller application status...</p>
        </section>
      </main>
    );
  }

  if (!accessToken || user?.role === "admin") return null;

  const applicationStatus = application?.status ?? "none";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CHAPTER SELLER CENTRE</p>
          <h1>Welcome{user?.name ? `, ${user.name}` : ""}.</h1>
          <p>
            Manage your book listings, track orders, and keep your readers
            informed.
          </p>
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleRefresh}
          disabled={refreshing || workspaceLoading}
        >
          {refreshing || workspaceLoading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </header>

      {!isApproved && applicationStatus === "pending" && (
        <section className={styles.statusCard}>
          <div className={`${styles.statusIcon} ${styles.pendingIcon}`}>…</div>
          <span className={styles.statusLabel}>APPLICATION PENDING</span>
          <h2>Your application is under review</h2>
          <p>
            Thank you for applying to become a Chapter seller. You can check
            your application status here while our admin team reviews it.
          </p>

          {application?.appliedAt && (
            <p className={styles.date}>
              Applied on {formatDate(application.appliedAt)}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Checking..." : "Refresh status"}
            </button>
            <Link href="/seller/apply" className={styles.textLink}>
              View application
            </Link>
          </div>
        </section>
      )}

      {!isApproved && applicationStatus === "rejected" && (
        <section className={styles.statusCard}>
          <div className={`${styles.statusIcon} ${styles.rejectedIcon}`}>!</div>
          <span className={styles.statusLabel}>APPLICATION REVIEW</span>
          <h2>Your application wasn't approved</h2>
          <p>
            You don't currently have permission to manage seller listings.
            Visit your application page to review your status.
          </p>
          {application?.reason && (
            <p className={styles.reason}>
              <strong>Review note:</strong> {application.reason}
            </p>
          )}
          <Link href="/seller/apply" className={styles.primaryButton}>
            View application
          </Link>
        </section>
      )}

      {!isApproved && applicationStatus === "none" && (
        <section className={styles.statusCard}>
          <div className={styles.statusIcon}>+</div>
          <span className={styles.statusLabel}>BECOME A SELLER</span>
          <h2>Ready to share your books?</h2>
          <p>
            Apply to become a Chapter seller. Once your application is
            approved, you can manage your own book listings and orders.
          </p>
          <Link href="/seller/apply" className={styles.primaryButton}>
            Apply to become a seller
          </Link>
        </section>
      )}

      {isApproved && (
        <>
          <section className={styles.approvedBanner}>
            <div>
              <span className={styles.approvedLabel}>
                <span className={styles.approvedDot} />
                SELLER ACCOUNT ACTIVE
              </span>
              <h2>Your bookstore, at a glance.</h2>
              <p>
                Keep your inventory up to date and make sure every order moves
                through fulfillment.
              </p>
            </div>
            <div className={styles.approvedCheck} aria-hidden="true">✓</div>
          </section>

          <nav className={styles.tabs} aria-label="Seller dashboard sections">
            {[
              ["overview", "Overview"],
              ["inventory", "My inventory"],
              ["orders", "Orders"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`${styles.tab} ${
                  activeTab === value ? styles.activeTab : ""
                }`}
                onClick={() => setActiveTab(value)}
                aria-current={activeTab === value ? "page" : undefined}
              >
                {label}
                {value === "orders" && orderCounts.newOrders > 0 && (
                  <span className={styles.tabCount}>
                    {orderCounts.newOrders}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {workspaceError && (
            <section className={styles.errorCard} role="alert">
              <div>
                <h2>We couldn't load your seller data</h2>
                <p>{workspaceError}</p>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={loadWorkspace}
                disabled={workspaceLoading}
              >
                Try again
              </button>
            </section>
          )}

          {activeTab === "overview" && (
            <>
              <section className={styles.statsGrid} aria-label="Seller summary">
                <article className={styles.statCard}>
                  <span className={styles.statLabel}>Book listings</span>
                  <strong className={styles.statValue}>
                    {inventorySummary.totalBooks ?? books.length}
                  </strong>
                  <span className={styles.statHint}>Your listed books</span>
                </article>

                <article className={styles.statCard}>
                  <span className={styles.statLabel}>Total stock</span>
                  <strong className={styles.statValue}>
                    {inventorySummary.totalStock ??
                      books.reduce((sum, book) => sum + Number(book.stock || 0), 0)}
                  </strong>
                  <span className={styles.statHint}>Units currently available</span>
                </article>

                <article className={styles.statCard}>
                  <span className={styles.statLabel}>New orders</span>
                  <strong className={styles.statValue}>
                    {orderCounts.newOrders}
                  </strong>
                  <span className={styles.statHint}>Awaiting confirmation</span>
                </article>

                <article className={styles.statCard}>
                  <span className={styles.statLabel}>Needs attention</span>
                  <strong className={styles.statValue}>
                    {(inventorySummary.lowStockBooks ??
                      books.filter((book) => Number(book.stock) > 0 && Number(book.stock) <= 5).length) +
                      (inventorySummary.outOfStockBooks ??
                        books.filter((book) => Number(book.stock) <= 0).length)}
                  </strong>
                  <span className={styles.statHint}>Low or out of stock</span>
                </article>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.eyebrow}>YOUR WORKSPACE</p>
                    <h2>Manage your bookstore</h2>
                    <p>Quick access to your everyday seller tasks.</p>
                  </div>
                </div>

                <div className={styles.actionGrid}>
                  <Link href="/seller/books/add" className={styles.actionCard}>
                    <span className={styles.actionIcon}>＋</span>
                    <h3>Add a new book</h3>
                    <p>Add the book's details, price, stock, and cover image.</p>
                    <span className={styles.cardLink}>Add a book →</span>
                  </Link>

                  <button
                    type="button"
                    className={styles.actionCard}
                    onClick={() => setActiveTab("inventory")}
                  >
                    <span className={styles.actionIcon}>▤</span>
                    <h3>My inventory</h3>
                    <p>Check your stock levels and find books that need attention.</p>
                    <span className={styles.cardLink}>View inventory →</span>
                  </button>

                  <button
                    type="button"
                    className={styles.actionCard}
                    onClick={() => setActiveTab("orders")}
                  >
                    <span className={styles.actionIcon}>↗</span>
                    <h3>Manage orders</h3>
                    <p>Review buyer details and update the fulfillment status.</p>
                    <span className={styles.cardLink}>View orders →</span>
                  </button>
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.eyebrow}>ORDER ACTIVITY</p>
                    <h2>Recent orders</h2>
                  </div>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => setActiveTab("orders")}
                  >
                    View all orders →
                  </button>
                </div>

                {workspaceLoading && orders.length === 0 ? (
                  <div className={styles.inlineLoading}>
                    <span className={styles.smallSpinner} />
                    Loading orders...
                  </div>
                ) : orders.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h3>No orders yet</h3>
                    <p>
                      Orders containing your books will appear here when
                      customers place them.
                    </p>
                  </div>
                ) : (
                  <div className={styles.orderList}>
                    {orders.slice(0, 3).map((order) => (
                      <OrderCard
                        key={getId(order) || order.orderNumber}
                        order={order}
                        updatingItem={updatingItem}
                        onStatusUpdate={handleStatusUpdate}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "inventory" && (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>YOUR BOOKS</p>
                  <h2>Inventory</h2>
                  <p>Only books belonging to your seller account are shown.</p>
                </div>
                <Link href="/seller/books/add" className={styles.primaryButton}>
                  + Add book
                </Link>
              </div>

              <div className={styles.filterBar}>
                <label className={styles.searchField}>
                  <span className={styles.srOnly}>Search books</span>
                  <input
                    type="search"
                    value={bookSearch}
                    onChange={(event) => setBookSearch(event.target.value)}
                    placeholder="Search by title, author, or category"
                  />
                </label>

                <label className={styles.filterField}>
                  <span className={styles.srOnly}>Filter by stock</span>
                  <select
                    value={stockFilter}
                    onChange={(event) => setStockFilter(event.target.value)}
                  >
                    <option value="all">All stock levels</option>
                    <option value="available">In stock</option>
                    <option value="low">Low stock (1–5)</option>
                    <option value="out">Out of stock</option>
                  </select>
                </label>
              </div>

              {workspaceLoading && books.length === 0 ? (
                <div className={styles.inlineLoading}>
                  <span className={styles.smallSpinner} />
                  Loading inventory...
                </div>
              ) : filteredBooks.length === 0 ? (
                <div className={styles.emptyState}>
                  <h3>{books.length ? "No matching books" : "Your inventory is empty"}</h3>
                  <p>
                    {books.length
                      ? "Try a different search or stock filter."
                      : "Add your first book to start building your inventory."}
                  </p>
                  {!books.length && (
                    <Link href="/seller/books/add" className={styles.primaryButton}>
                      Add your first book
                    </Link>
                  )}
                </div>
              ) : (
                <div className={styles.inventoryList}>
                  {filteredBooks.map((book) => (
                    <article className={styles.inventoryCard} key={getId(book)}>
                      <div className={styles.bookCover}>
                        {book.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={book.coverImage} alt={`${book.title} cover`} />
                        ) : (
                          <span aria-hidden="true">CH.</span>
                        )}
                      </div>

                      <div className={styles.bookInfo}>
                        <h3>{book.title || "Untitled book"}</h3>
                        <p>{book.author || "Author not specified"}</p>
                        {book.category && (
                          <span className={styles.categoryTag}>{book.category}</span>
                        )}
                      </div>

                      <div className={styles.bookPrice}>
                        <span className={styles.detailLabel}>Price</span>
                        <strong>{formatCurrency(book.price)}</strong>
                      </div>

                      <div className={styles.stockInfo}>
                        <span className={styles.detailLabel}>Stock</span>
                        <strong>{Number(book.stock ?? 0)}</strong>
                        <span className={`${styles.stockBadge} ${getStockClass(book.stock)}`}>
                          {getStockLabel(book.stock)}
                        </span>
                      </div>

                      <Link
                        href="/seller/books"
                        className={styles.smallLink}
                        aria-label={`Manage listing for ${book.title || "this book"}`}
                      >
                        Manage listing →
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "orders" && (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>FULFILLMENT</p>
                  <h2>Customer orders</h2>
                  <p>
                    Buyer and delivery details are shown for orders containing
                    your books.
                  </p>
                </div>
              </div>

              <section className={styles.orderStats}>
                <div><strong>{orderCounts.newOrders}</strong><span>New</span></div>
                <div><strong>{orderCounts.processing}</strong><span>Processing</span></div>
                <div><strong>{orderCounts.shipped}</strong><span>Shipped</span></div>
                <div><strong>{orderCounts.delivered}</strong><span>Delivered</span></div>
              </section>

              <div className={styles.filterBar}>
                <label className={styles.searchField}>
                  <span className={styles.srOnly}>Search orders</span>
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Search order number, buyer, email, or book"
                  />
                </label>

                <label className={styles.filterField}>
                  <span className={styles.srOnly}>Filter orders by status</span>
                  <select
                    value={orderFilter}
                    onChange={(event) => setOrderFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="placed">New orders</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>

              {workspaceLoading && orders.length === 0 ? (
                <div className={styles.inlineLoading}>
                  <span className={styles.smallSpinner} />
                  Loading orders...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className={styles.emptyState}>
                  <h3>No matching orders</h3>
                  <p>
                    {orders.length
                      ? "Try changing your search or status filter."
                      : "Orders containing your books will appear here."}
                  </p>
                </div>
              ) : (
                <div className={styles.orderList}>
                  {filteredOrders.map((order) => (
                    <OrderCard
                      key={getId(order) || order.orderNumber}
                      order={order}
                      updatingItem={updatingItem}
                      onStatusUpdate={handleStatusUpdate}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          <footer className={styles.dashboardFooter}>
            <Link href="/seller/apply">Seller application</Link>
            <span>Chapter Seller Centre</span>
          </footer>
        </>
      )}
    </main>
  );
}

function OrderCard({ order, updatingItem, onStatusUpdate }) {
  const buyer = order.buyer ?? order.user ?? {};
  const address = order.shippingAddress ?? {};
  const items = order.items ?? [];
  const orderId = getId(order);

  return (
    <article className={styles.orderCard}>
      <header className={styles.orderHeader}>
        <div>
          <span className={styles.detailLabel}>ORDER</span>
          <h3>{order.orderNumber || orderId || "Order details"}</h3>
          <p>Placed on {formatDate(order.createdAt)}</p>
        </div>

        <div className={styles.orderPayment}>
          <span className={styles.detailLabel}>Payment</span>
          <strong>{String(order.paymentMethod ?? "COD").toUpperCase()}</strong>
          <span className={styles.paymentStatus}>
            {formatStatus(order.paymentStatus ?? "pending")}
          </span>
        </div>
      </header>

      <div className={styles.buyerGrid}>
        <section className={styles.buyerPanel}>
          <h4>Customer</h4>
          <p className={styles.buyerName}>
            {address.fullName || buyer.name || "Customer"}
          </p>
          {buyer.email && (
            <a href={`mailto:${buyer.email}`}>{buyer.email}</a>
          )}
          {address.phone && <a href={`tel:${address.phone}`}>{address.phone}</a>}
          {!buyer.email && !address.phone && (
            <p className={styles.mutedText}>Contact details unavailable</p>
          )}
        </section>

        <section className={styles.buyerPanel}>
          <h4>Shipping address</h4>
          {getAddressLines(address).length ? (
            <address>
              {getAddressLines(address).map((line, index) => (
                <span key={`${line}-${index}`}>{line}</span>
              ))}
            </address>
          ) : (
            <p className={styles.mutedText}>Shipping address unavailable</p>
          )}
        </section>
      </div>

      <div className={styles.orderItems}>
        <h4>Your items in this order</h4>

        {items.map((item, index) => {
          const status = getItemStatus(item);
          const nextStatus = NEXT_STATUS[status];
          const bookId = getId(item.book) || item.bookId;
          const itemKey = `${orderId}-${bookId}`;
          const isUpdating = updatingItem === itemKey;

          return (
            <div
              className={styles.orderItem}
              key={`${bookId || item.title}-${index}`}
            >
              <div className={styles.orderItemMain}>
                <h5>{item.title || "Book"}</h5>
                {item.author && <p>{item.author}</p>}
                <p>
                  {item.quantity} × {formatCurrency(item.price)}
                </p>
              </div>

              <div className={styles.orderItemStatus}>
                <span className={`${styles.statusPill} ${styles[`status_${status}`] || ""}`}>
                  {formatStatus(status)}
                </span>

                {nextStatus && (
                  <button
                    type="button"
                    className={styles.statusButton}
                    onClick={() =>
                      onStatusUpdate(orderId, item, nextStatus)
                    }
                    disabled={isUpdating}
                  >
                    {isUpdating
                      ? "Saving..."
                      : `Mark ${formatStatus(nextStatus).toLowerCase()}`}
                  </button>
                )}

                {!nextStatus && status === "delivered" && (
                  <span className={styles.completedText}>Fulfilled</span>
                )}

                {!nextStatus && status === "cancelled" && (
                  <span className={styles.completedText}>Cancelled</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
