
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import {
  fetchWishlist,
  removeFromWishlist,
  clearWishlist,
} from "@/store/wishlist/wishlistSlice";

import { addToCart, fetchCart } from "@/store/cart/cartThunks";

import styles from "./wishlist.module.css";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
}

function getBookId(book) {
  return String(book?._id || book?.id || "");
}

function getAuthor(book) {
  const author = book?.author || book?.authors;

  return Array.isArray(author)
    ? author.join(", ")
    : author || "Unknown author";
}

function getCoverImage(book) {
  const image = book?.coverImage || book?.imageUrl || book?.image;

  if (typeof image === "string") return image;

  if (image && typeof image === "object") {
    return image.url || image.secure_url || "";
  }

  return "";
}

export default function WishlistPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { user, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const {
    books = [],
    loading,
    error,
  } = useSelector((state) => state.wishlist);

  const [busyBookId, setBusyBookId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!user) {
      router.replace("/login?redirect=/wishlist");
      return;
    }

    if (user.role === "admin") {
      router.replace("/");
      return;
    }

    dispatch(fetchWishlist());
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

  async function handleRemove(bookId) {
    if (!bookId || busyBookId || clearing) return;

    setBusyBookId(bookId);

    try {
      const result = await dispatch(removeFromWishlist(bookId));

      if (removeFromWishlist.fulfilled.match(result)) {
        toast.success("Book removed from your wishlist.");
      } else {
        toast.error(
          result.payload || "Unable to remove this book."
        );
      }
    } finally {
      setBusyBookId(null);
    }
  }

  async function handleClearWishlist() {
    if (clearing || busyBookId || books.length === 0) return;

    setClearing(true);

    try {
      const result = await dispatch(clearWishlist());

      if (clearWishlist.fulfilled.match(result)) {
        setConfirmClear(false);
        toast.success("Your wishlist has been cleared.");
      } else {
        toast.error(
          result.payload || "Unable to clear your wishlist."
        );
      }
    } finally {
      setClearing(false);
    }
  }

  async function handleAddToCart(book) {
    const bookId = getBookId(book);

    if (!bookId || busyBookId || clearing) return;

    if (Number(book.stock) <= 0) {
      toast.error("This book is currently out of stock.");
      return;
    }

    setBusyBookId(bookId);

    try {
      const result = await dispatch(
        addToCart({
          bookId,
          quantity: 1,
        })
      );

      if (addToCart.fulfilled.match(result)) {
        toast.success("Book added to your cart.");
        dispatch(fetchCart());
      } else {
        toast.error(
          result.payload || "Unable to add this book to your cart."
        );
      }
    } finally {
      setBusyBookId(null);
    }
  }

  if (!initialized || restoring || !user) {
    return (
      <main className={styles.page}>
        <div className={styles.status}>
          <span className={styles.loadingMark}>C.</span>
          <p>Preparing your wishlist...</p>
        </div>
      </main>
    );
  }

  if (user.role === "admin") return null;

  const actionBusy = loading || clearing || Boolean(busyBookId);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/books">Books</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Wishlist</span>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>BOOKS WORTH REMEMBERING</p>
            <h1>Your wishlist.</h1>
            <p className={styles.subtitle}>
              Keep the books you love close. When you're ready,
              your next chapter is waiting.
            </p>
          </div>

          
        </header>

        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>YOUR PERSONAL COLLECTION</p>
            <h2>
              Saved books{" "}
              <span className={styles.countBadge}>{books.length}</span>
            </h2>
          </div>

          <Link href="/books" className={styles.continueLink}>
            <span aria-hidden="true">←</span>
            Explore books
          </Link>
        </div>

        {loading && books.length === 0 ? (
          <section className={styles.status} role="status">
            <span className={styles.loadingMark}>C.</span>
            <p>Gathering your saved books...</p>
          </section>
        ) : error && books.length === 0 ? (
          <section className={styles.empty}>
            <p className={styles.eyebrow}>LET'S TRY AGAIN</p>
            <h2>Your wishlist couldn't be loaded.</h2>
            <p>{error}</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => dispatch(fetchWishlist())}
            >
              Try again
            </button>
          </section>
        ) : books.length === 0 ? (
          <section className={styles.empty}>
            <div className={styles.emptyBook} aria-hidden="true">
              <span>C.</span>
              <i />
              <i />
              <i />
            </div>

            <p className={styles.eyebrow}>YOUR NEXT FAVOURITE IS OUT THERE</p>
            <h2>Save a little room for a good story.</h2>
            <p className={styles.emptyDescription}>
              Your wishlist is empty for now. Browse the collection
              and tap the heart on any book you want to keep.
            </p>

            <Link href="/books" className={styles.primaryButton}>
              Explore the collection
              <span aria-hidden="true">→</span>
            </Link>

            <p className={styles.emptyFootnote}>
              Your saved books will be waiting when you return.
            </p>
          </section>
        ) : (
          <>
            <div className={styles.toolbar}>
              <p>
                {books.length}{" "}
                {books.length === 1 ? "book" : "books"} saved for later
              </p>

              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setConfirmClear(true)}
                disabled={actionBusy}
              >
                Clear wishlist
              </button>
            </div>

            <section
              className={styles.bookGrid}
              aria-label="Your saved books"
            >
              {books.map((book) => {
                const bookId = getBookId(book);
                const title = book.title || "Untitled book";
                const author = getAuthor(book);
                const coverImage = getCoverImage(book);
                const stock = Number(book.stock) || 0;
                const price = Number(book.price) || 0;
                const itemBusy =
                  clearing || busyBookId === bookId;

                return (
                  <article className={styles.bookCard} key={bookId}>
                    <div className={styles.coverArea}>
                      <Link
                        href={`/books/${bookId}`}
                        className={styles.coverLink}
                        aria-label={`View ${title}`}
                      >
                        <div className={styles.cover}>
                          {coverImage && !imageErrors[bookId] ? (
                            <img
                              src={coverImage}
                              alt={`Cover of ${title}`}
                              loading="lazy"
                              onError={() =>
                                setImageErrors((previous) => ({
                                  ...previous,
                                  [bookId]: true,
                                }))
                              }
                            />
                          ) : (
                            <div className={styles.coverPlaceholder}>
                              <span>Chapter.</span>
                              <small>A BOOK TO DISCOVER</small>
                            </div>
                          )}
                        </div>
                      </Link>

                      <span
                        className={styles.savedMark}
                        aria-label="Saved to wishlist"
                        title="Saved to wishlist"
                      >
                        ♥
                      </span>
                    </div>

                    <div className={styles.bookDetails}>
                      <p className={styles.itemType}>SAVED BOOK</p>

                      <h3>
                        <Link href={`/books/${bookId}`}>
                          {title}
                        </Link>
                      </h3>

                      <p className={styles.author}>by {author}</p>

                      <p className={styles.price}>
                        {formatPrice(price)}
                      </p>

                      {stock <= 0 ? (
                        <p className={styles.stockWarning}>
                          Currently out of stock
                        </p>
                      ) : stock <= 3 ? (
                        <p className={styles.stockNote}>
                          Only {stock} {stock === 1 ? "copy" : "copies"}{" "}
                          left
                        </p>
                      ) : null}

                      <div className={styles.bookActions}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={itemBusy || stock <= 0}
                          onClick={() => handleAddToCart(book)}
                        >
                          {busyBookId === bookId
                            ? "Please wait..."
                            : stock <= 0
                              ? "Out of stock"
                              : "Add to cart"}
                        </button>

                        <button
                          type="button"
                          className={styles.removeButton}
                          disabled={itemBusy}
                          onClick={() => handleRemove(bookId)}
                        >
                          {busyBookId === bookId
                            ? "Please wait..."
                            : "Remove"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
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
            aria-labelledby="clear-wishlist-title"
            aria-describedby="clear-wishlist-description"
          >
            <div className={styles.modalMark} aria-hidden="true">
              C.
            </div>

            <p className={styles.eyebrow}>A QUICK CHECK</p>
            <h2 id="clear-wishlist-title">Clear your wishlist?</h2>
            <p id="clear-wishlist-description">
              This will remove all {books.length}{" "}
              {books.length === 1 ? "book" : "books"} from your
              saved collection.
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
                onClick={handleClearWishlist}
              >
                {clearing ? "Clearing..." : "Yes, clear wishlist"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
