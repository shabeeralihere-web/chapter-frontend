
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import {
  fetchCart,
  updateCartItem,
  removeCartItem,
  clearCartOnServer,
} from "@/store/cart/cartThunks";

import styles from "./cart.module.css";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
}

function getItemCount(items) {
  return items.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0
  );
}

export default function CartPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { user, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const {
    items = [],
    summary,
    loading,
    error,
  } = useSelector((state) => state.cart);

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [busyBookId, setBusyBookId] = useState(null);

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!user) {
      router.replace("/login?redirect=/cart");
      return;
    }

    if (user.role === "admin") {
      router.replace("/");
      return;
    }

    dispatch(fetchCart());
  }, [initialized, restoring, user, dispatch, router]);

  useEffect(() => {
    if (!confirmClear) return;

    function handleEscape(event) {
      if (event.key === "Escape" && !clearing) {
        setConfirmClear(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [confirmClear, clearing]);

  async function handleQuantityChange(item, quantity) {
    if (quantity < 1 || clearing || busyBookId) return;

    const bookId = item.book?._id;

    if (!bookId) {
      toast.error("This book is no longer available.");
      return;
    }

    setBusyBookId(bookId);

    try {
      const result = await dispatch(
        updateCartItem({ bookId, quantity })
      );

      if (updateCartItem.fulfilled.match(result)) {
        toast.success("Quantity updated.");
      } else {
        toast.error(
          result.payload || "Unable to update quantity."
        );
      }
    } finally {
      setBusyBookId(null);
    }
  }

  async function handleRemove(bookId) {
    if (!bookId || clearing || busyBookId) return;

    setBusyBookId(bookId);

    try {
      const result = await dispatch(removeCartItem(bookId));

      if (removeCartItem.fulfilled.match(result)) {
        toast.success("Book removed from your cart.");
      } else {
        toast.error(result.payload || "Unable to remove book.");
      }
    } finally {
      setBusyBookId(null);
    }
  }

  async function handleClearCart() {
    if (clearing || busyBookId || items.length === 0) return;

    setClearing(true);

    try {
      const result = await dispatch(clearCartOnServer());

      if (clearCartOnServer.fulfilled.match(result)) {
        setConfirmClear(false);
        toast.success("Your cart has been cleared.");
      } else {
        toast.error(
          result.payload || "Unable to clear your cart."
        );
      }
    } finally {
      setClearing(false);
    }
  }

  if (!initialized || restoring || !user) {
    return (
      <main className={styles.page}>
        <div className={styles.status}>
          <span className={styles.loadingMark}>C.</span>
          <p>Preparing your reading list...</p>
        </div>
      </main>
    );
  }

  if (user.role === "admin") return null;

  const itemCount = summary?.totalItems ?? getItemCount(items);
  const subtotal =
    summary?.subtotal ??
    items.reduce(
      (total, item) =>
        total +
        (Number(item.itemSubtotal) ||
          (Number(item.unitPrice ?? item.book?.price) || 0) *
            (Number(item.quantity) || 0)),
      0
    );

  const shippingFee = Number(summary?.shippingFee) || 0;
  const discount = Number(summary?.discount) || 0;
  const totalPrice =
    summary?.totalPrice ?? subtotal + shippingFee - discount;

  const hasStockIssue = items.some(
    (item) =>
      !item.book ||
      Number(item.book.stock) < Number(item.quantity)
  );

  const actionBusy = loading || clearing || Boolean(busyBookId);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/books">Books</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Your cart</span>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>YOUR NEXT CHAPTER STARTS HERE</p>
            <h1>Your reading list.</h1>
            <p className={styles.subtitle}>
              Take another look at the books you’ve chosen.
              Your next favourite story could be right here.
            </p>
          </div>

         
        </header>

        <div className={styles.progress}>
          <div className={styles.progressStep}>
            <span className={styles.progressNumber}>01</span>
            <span className={styles.progressLabel}>Your cart</span>
          </div>
          <span className={styles.progressLine} />
          <div className={styles.progressStep}>
            <span className={styles.progressNumberMuted}>02</span>
            <span className={styles.progressLabelMuted}>Checkout</span>
          </div>
          <span className={styles.progressLine} />
          <div className={styles.progressStep}>
            <span className={styles.progressNumberMuted}>03</span>
            <span className={styles.progressLabelMuted}>Order placed</span>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <section className={styles.status}>
            <span className={styles.loadingMark}>C.</span>
            <p>Gathering your books...</p>
          </section>
        ) : error && items.length === 0 ? (
          <section className={styles.empty}>
            <p className={styles.eyebrow}>LET’S TRY AGAIN</p>
            <h2>Your cart couldn’t be loaded.</h2>
            <p>{error}</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => dispatch(fetchCart())}
            >
              Try again
            </button>
          </section>
        ) : items.length === 0 ? (
          <section className={styles.empty}>
            <div className={styles.emptyBook} aria-hidden="true">
              <span>C.</span>
              <i />
              <i />
              <i />
            </div>
            <p className={styles.eyebrow}>A LITTLE ROOM FOR A NEW STORY</p>
            <h2>Your next read is waiting.</h2>
            <p className={styles.emptyDescription}>
              Your cart is empty for now. Explore the collection,
              discover a new author, and find a book worth keeping.
            </p>
            <Link href="/books" className={styles.primaryButton}>
              Explore the collection
              <span aria-hidden="true">→</span>
            </Link>
            <p className={styles.emptyFootnote}>
              Every great reading journey begins with one book.
            </p>
          </section>
        ) : (
          <>
            <div className={styles.cartToolbar}>
              <div>
                <p className={styles.eyebrow}>YOUR SELECTED BOOKS</p>
                <h2>
                  In your cart{" "}
                  <span className={styles.countBadge}>{itemCount}</span>
                </h2>
              </div>

              <div className={styles.toolbarActions}>
                <Link href="/books" className={styles.continueLink}>
                  <span aria-hidden="true">←</span>
                  Continue shopping
                </Link>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => setConfirmClear(true)}
                  disabled={actionBusy}
                >
                  Clear cart
                </button>
              </div>
            </div>

            <div className={styles.layout}>
              <section className={styles.itemsPanel}>
                <div className={styles.panelHeading}>
                  <h3>Your books</h3>
                  <p>Review each title before checkout.</p>
                </div>

                {items.map((item) => {
                  const book = item.book;
                  const bookId = book?._id;

                  if (!book) return null;

                  const quantity = Number(item.quantity) || 1;
                  const stock = Number(book.stock) || 0;
                  const unitPrice = Number(
                    item.unitPrice ?? book.price
                  ) || 0;
                  const lineTotal =
                    Number(item.itemSubtotal) ||
                    unitPrice * quantity;
                  const itemBusy =
                    loading ||
                    clearing ||
                    busyBookId === bookId;

                  return (
                    <article className={styles.cartItem} key={bookId}>
                      <Link
                        href={`/books/${bookId}`}
                        className={styles.coverLink}
                        aria-label={`View ${book.title}`}
                      >
                        <div className={styles.cover}>
                          {book.coverImage ? (
                            <img
                              src={book.coverImage}
                              alt={`Cover of ${book.title}`}
                            />
                          ) : (
                            <div className={styles.coverPlaceholder}>
                              <span>Chapter.</span>
                              <small>A BOOK TO DISCOVER</small>
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className={styles.itemDetails}>
                        <p className={styles.itemType}>BOOK</p>
                        <h3>
                          <Link href={`/books/${bookId}`}>
                            {book.title}
                          </Link>
                        </h3>
                        <p className={styles.author}>
                          by {book.author || "Unknown author"}
                        </p>

                        <p className={styles.unitPrice}>
                          {formatPrice(unitPrice)}
                          <span> per copy</span>
                        </p>

                        <div className={styles.itemActions}>
                          <div
                            className={styles.quantityControl}
                            aria-label={`Quantity for ${book.title}`}
                          >
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              disabled={itemBusy || quantity <= 1}
                              onClick={() =>
                                handleQuantityChange(item, quantity - 1)
                              }
                            >
                              −
                            </button>
                            <span aria-live="polite">{quantity}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              disabled={
                                itemBusy ||
                                quantity >= Math.min(stock, 99)
                              }
                              onClick={() =>
                                handleQuantityChange(item, quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            className={styles.removeButton}
                            disabled={itemBusy}
                            onClick={() => handleRemove(bookId)}
                          >
                            {busyBookId === bookId
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        </div>

                        {stock === 0 ? (
                          <p className={styles.stockWarning}>
                            Currently out of stock
                          </p>
                        ) : stock < quantity ? (
                          <p className={styles.stockWarning}>
                            Only {stock} {stock === 1 ? "copy" : "copies"}{" "}
                            available. Update the quantity to continue.
                          </p>
                        ) : stock <= 3 ? (
                          <p className={styles.stockNote}>
                            Only {stock} {stock === 1 ? "copy" : "copies"}{" "}
                            left in stock
                          </p>
                        ) : null}
                      </div>

                      <div className={styles.linePrice}>
                        <span className={styles.linePriceLabel}>
                          Item total
                        </span>
                        <strong>{formatPrice(lineTotal)}</strong>
                      </div>
                    </article>
                  );
                })}

                <div className={styles.keepBrowsing}>
                  <span className={styles.keepBrowsingMark}>+</span>
                  <div>
                    <strong>Something else caught your eye?</strong>
                    <p>Keep exploring and find another book to love.</p>
                  </div>
                  <Link href="/books" aria-label="Browse more books">
                    Browse books <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </section>

              <aside className={styles.summaryPanel}>
                <div className={styles.summaryHeader}>
                  <p className={styles.eyebrow}>THE DETAILS</p>
                  <h2>Order summary</h2>
                  <p>Here’s how your order adds up.</p>
                </div>

                <div className={styles.summaryContents}>
                  <div className={styles.summaryRow}>
                    <span>Books ({itemCount})</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  <div className={styles.summaryRow}>
                    <span>Shipping</span>
                    <span className={styles.freeShipping}>
                      {shippingFee ? formatPrice(shippingFee) : "Free"}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className={styles.summaryRow}>
                      <span>Discount</span>
                      <span className={styles.discountValue}>
                        −{formatPrice(discount)}
                      </span>
                    </div>
                  )}

                  <div className={styles.summaryDivider} />

                  <div className={styles.totalRow}>
                    <div>
                      <strong>Total</strong>
                      <span>Inclusive of applicable charges</span>
                    </div>
                    <strong>{formatPrice(totalPrice)}</strong>
                  </div>

                  <button
                    type="button"
                    className={styles.checkoutButton}
                    disabled={actionBusy || hasStockIssue}
                    onClick={() => router.push("/checkout")}
                  >
                    Proceed to checkout
                    <span aria-hidden="true">→</span>
                  </button>

                  {hasStockIssue && (
                    <p className={styles.checkoutWarning}>
                      Please update unavailable or out-of-stock books
                      before proceeding.
                    </p>
                  )}

                  <div className={styles.checkoutNote}>
                    <span className={styles.noteMark} aria-hidden="true">
                      ✓
                    </span>
                    <p>
                      You’ll review your delivery details and final
                      order information before placing your order.
                    </p>
                  </div>
                </div>

                <div className={styles.summaryFooter}>
                  <span>CHAPTER.</span>
                  <p>Make room for a good story.</p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {confirmClear && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !clearing
            ) {
              setConfirmClear(false);
            }
          }}
        >
          <section
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-cart-title"
            aria-describedby="clear-cart-description"
          >
            <div className={styles.modalMark} aria-hidden="true">
              C.
            </div>
            <p className={styles.eyebrow}>A QUICK CHECK</p>
            <h2 id="clear-cart-title">Clear your cart?</h2>
            <p id="clear-cart-description">
              This will remove all {itemCount}{" "}
              {itemCount === 1 ? "copy" : "copies"} from your cart.
              You can always come back and choose your books again.
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={clearing}
                onClick={() => setConfirmClear(false)}
              >
                Keep my books
              </button>
              <button
                type="button"
                className={styles.confirmClearButton}
                disabled={clearing}
                onClick={handleClearCart}
              >
                {clearing ? "Clearing cart..." : "Yes, clear cart"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
