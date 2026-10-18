
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { fetchBooks } from "@/store/books/booksSlice";
import { addToCart, fetchCart } from "@/store/cart/cartThunks";
import {
  fetchWishlist,
  addToWishlist,
  removeFromWishlist,
} from "@/store/wishlist/wishlistSlice";

import styles from "./books.module.css";

const titleOf = (book) => book.title || book.name || "Untitled book";

const authorOf = (book) => {
  const author = book.author || book.authors;
  return Array.isArray(author)
    ? author.join(", ")
    : author || "Independent author";
};

const idOf = (book) => String(book?._id || book?.id || "");

const roleOf = (user) => String(user?.role || "").toLowerCase();

const userIdOf = (user) =>
  String(user?._id || user?.id || user?.userId || user?.user?._id || "");

const sellerIdOf = (book) => {
  const seller = book?.seller || book?.sellerId || book?.owner;

  if (typeof seller === "string" || typeof seller === "number") {
    return String(seller);
  }

  return String(seller?._id || seller?.id || seller?.userId || "");
};

const categoriesOf = (book) => {
  const values = Array.isArray(book.categories)
    ? book.categories
    : book.category
      ? [book.category]
      : book.genre
        ? [book.genre]
        : [];

  return values
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) =>
      typeof item === "object" ? item?.name || item?.title || "" : String(item)
    )
    .filter(Boolean);
};

const imageOf = (book) => {
  const image =
    book.coverImage ||
    book.imageUrl ||
    book.image ||
    book.thumbnail ||
    book.bookImage ||
    "";

  return typeof image === "string"
    ? image
    : image?.url || image?.secure_url || "";
};

const priceOf = (book) => {
  const value = book.price ?? book.sellingPrice;
  if (value === undefined || value === null || value === "") return null;

  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
};

const stockOf = (book) => {
  const value = book.stock ?? book.quantity;
  if (value === undefined || value === null || value === "") return null;

  const stock = Number(value);
  return Number.isFinite(stock) && stock >= 0 ? stock : null;
};

const formatPrice = (price, currency = "INR") => {
  if (price === null) return "Price unavailable";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `₹${price.toLocaleString("en-IN")}`;
  }
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

function BookCard({
  book,
  accessToken,
  user,
  cartItems,
  wishlistBooks,
  wishlistLoadingId,
  onAddToCart,
  onToggleWishlist,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const id = idOf(book);
  const title = titleOf(book);
  const author = authorOf(book);
  const image = imageOf(book);
  const categories = categoriesOf(book);
  const price = priceOf(book);
  const stock = stockOf(book);

  const role = roleOf(user);
  const currentUserId = userIdOf(user);
  const sellerId = sellerIdOf(book);

  const isOwnBook =
    role === "seller" &&
    Boolean(currentUserId) &&
    Boolean(sellerId) &&
    currentUserId === sellerId;

  const cartBookIds = cartItems.map((item) => {
    const value = item?.book || item?.product || item?.bookId || item?.productId;
    return String(
      typeof value === "object"
        ? value?._id || value?.id || ""
        : value || ""
    );
  });

  const alreadyInCart = cartBookIds.includes(id);
  const isWishlisted = wishlistBooks.some((saved) => idOf(saved) === id);
  const wishlistBusy = wishlistLoadingId === id;

  const canPurchase =
    Boolean(accessToken) &&
    (role === "user" || role === "seller") &&
    !isOwnBook &&
    stock !== null &&
    stock > 0 &&
    price !== null &&
    Boolean(id);

  return (
    <article className={styles.bookCard}>
      <div className={styles.coverArea}>
        <Link
          href={id ? `/books/${id}` : "/books"}
          className={styles.coverLink}
          aria-label={`View ${title} by ${author}`}
        >
          <div className={styles.coverWrap}>
            {image && !imageFailed ? (
              <img
                className={styles.coverImage}
                src={image}
                alt={`Cover of ${title}`}
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className={styles.coverFallback}>
                <span className={styles.fallbackBrand}>CHAPTER.</span>
                <span className={styles.fallbackRule} />
                <span className={styles.fallbackTitle}>{title}</span>
                <span className={styles.fallbackAuthor}>{author}</span>
              </div>
            )}
          </div>
        </Link>

        {!isOwnBook && (
          <button
            type="button"
            className={`${styles.wishlistButton} ${
              isWishlisted ? styles.wishlistActive : ""
            }`}
            onClick={() => onToggleWishlist(book, isWishlisted)}
            disabled={!id || wishlistBusy}
            aria-label={
              isWishlisted ? "Remove from wishlist" : "Add to wishlist"
            }
            aria-pressed={isWishlisted}
          >
            <HeartIcon filled={isWishlisted} />
          </button>
        )}
      </div>

      <div className={styles.bookInfo}>
        {categories[0] && (
          <span className={styles.categoryLabel}>{categories[0]}</span>
        )}

        <Link
          href={id ? `/books/${id}` : "/books"}
          className={styles.bookLink}
        >
          <h2 className={styles.bookTitle}>{title}</h2>
        </Link>

        <p className={styles.bookAuthor}>by {author}</p>

        <div className={styles.cardBottom}>
          <span className={styles.price}>
            {formatPrice(price, book.currency || "INR")}
          </span>
          {stock === 0 && (
            <span className={styles.stockUnavailable}>Out of stock</span>
          )}
          {stock !== null && stock > 0 && stock <= 3 && (
            <span className={styles.lowStock}>Only {stock} left</span>
          )}
        </div>

        {isOwnBook ? (
          <Link href="/seller/books" className={styles.secondaryButton}>
            Manage book
          </Link>
        ) : stock === 0 ? (
          <button className={styles.disabledButton} disabled>
            Out of stock
          </button>
        ) : !accessToken ? (
          <button
            className={styles.addButton}
            onClick={() => onAddToCart(book, false)}
          >
            Add to cart
          </button>
        ) : canPurchase ? (
          <button
            className={styles.addButton}
            onClick={() => onAddToCart(book, alreadyInCart)}
          >
            {alreadyInCart ? "View in cart" : "Add to cart"}
          </button>
        ) : (
          <button className={styles.disabledButton} disabled>
            Unavailable
          </button>
        )}
      </div>
    </article>
  );
}

export default function BooksPage() {
  const dispatch = useDispatch();

  const { items = [], loading, error } = useSelector(
    (state) => state.books
  );

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const cartItems = useSelector((state) => state.cart?.items || []);
  const wishlistBooks = useSelector(
    (state) => state.wishlist?.books || []
  );

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All books");
  const [sortBy, setSortBy] = useState("newest");
  const [wishlistLoadingId, setWishlistLoadingId] = useState(null);
  const [addingId, setAddingId] = useState(null);

  const role = roleOf(user);
  const currentUserId = userIdOf(user);

  useEffect(() => {
    dispatch(fetchBooks());
  }, [dispatch]);

  useEffect(() => {
    if (!initialized || restoring || !accessToken) return;

    if (role === "user" || role === "seller") {
      dispatch(fetchCart());
      dispatch(fetchWishlist());
    }
  }, [dispatch, initialized, restoring, accessToken, role]);

  const publicBooks = useMemo(() => {
    if (role !== "seller" || !currentUserId) return items;

    return items.filter((book) => {
      const sellerId = sellerIdOf(book);
      return !sellerId || sellerId !== currentUserId;
    });
  }, [items, role, currentUserId]);

  const categories = useMemo(() => {
    const values = publicBooks.flatMap(categoriesOf);
    return [
      "All books",
      ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [publicBooks]);

  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase();

    let result = publicBooks.filter((book) => {
      const searchableText = [
        titleOf(book),
        authorOf(book),
        ...categoriesOf(book),
        book.description || book.summary || "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        searchableText.includes(term) &&
        (selectedCategory === "All books" ||
          categoriesOf(book).includes(selectedCategory))
      );
    });

    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt || b.created_at || 0).getTime() -
          new Date(a.createdAt || a.created_at || 0).getTime()
      );
    } else if (sortBy === "title") {
      result.sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    } else if (sortBy === "price-low") {
      result.sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => (priceOf(b) ?? -Infinity) - (priceOf(a) ?? -Infinity));
    }

    return result;
  }, [publicBooks, search, selectedCategory, sortBy]);

  function clearFilters() {
    setSearch("");
    setSelectedCategory("All books");
    setSortBy("newest");
  }

  async function handleAddToCart(book, alreadyInCart) {
    if (!accessToken || !user) {
      window.location.href = `/login?redirect=${encodeURIComponent("/books")}`;
      return;
    }

    const bookSellerId = sellerIdOf(book);

    if (
      role === "seller" &&
      currentUserId &&
      bookSellerId &&
      currentUserId === bookSellerId
    ) {
      toast.error("You cannot add your own book to the cart.");
      return;
    }

    if (role !== "user" && role !== "seller") {
      toast.error("Your account cannot purchase books.");
      return;
    }

    if (alreadyInCart) {
      window.location.href = "/cart";
      return;
    }

    const id = idOf(book);
    if (!id || addingId) return;

    if (priceOf(book) === null) {
      toast.error("This book's price is unavailable.");
      return;
    }

    if (stockOf(book) === null || stockOf(book) <= 0) {
      toast.error("This book is currently unavailable.");
      return;
    }

    setAddingId(id);

    try {
      await dispatch(addToCart({ bookId: id, quantity: 1 })).unwrap();
      toast.success("Book added to your cart.");
      dispatch(fetchCart());
    } catch (requestError) {
      toast.error(
        typeof requestError === "string"
          ? requestError
          : requestError?.message || "Unable to add this book to your cart."
      );
      dispatch(fetchCart());
    } finally {
      setAddingId(null);
    }
  }

  async function handleToggleWishlist(book, isWishlisted) {
    if (!accessToken || !user) {
      window.location.href = `/login?redirect=${encodeURIComponent("/books")}`;
      return;
    }

    if (role !== "user" && role !== "seller") {
      toast.error("Your account cannot use the wishlist.");
      return;
    }

    const id = idOf(book);
    if (!id || wishlistLoadingId) return;

    const bookSellerId = sellerIdOf(book);

    if (
      role === "seller" &&
      currentUserId &&
      bookSellerId &&
      currentUserId === bookSellerId
    ) {
      toast.error("You cannot wishlist your own book.");
      return;
    }

    setWishlistLoadingId(id);

    try {
      if (isWishlisted) {
        await dispatch(removeFromWishlist(id)).unwrap();
        toast.success("Removed from wishlist.");
      } else {
        await dispatch(addToWishlist(id)).unwrap();
        toast.success("Added to wishlist.");
      }

      dispatch(fetchWishlist());
    } catch (requestError) {
      toast.error(
        typeof requestError === "string"
          ? requestError
          : requestError?.message || "Unable to update your wishlist."
      );
    } finally {
      setWishlistLoadingId(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>THE COLLECTION</p>
          <h1 className={styles.title}>Find your next read.</h1>
        </header>

        <section className={styles.toolbar} aria-label="Search and filter books">
          <label className={styles.searchWrapper}>
            <span className={styles.searchIcon}>
              <SearchIcon />
            </span>
            <input
              className={styles.searchInput}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, author, or category..."
              aria-label="Search books"
            />
          </label>

          <div className={styles.filters}>
            <label className={styles.filterGroup}>
              <span className={styles.filterLabel}>Category</span>
              <select
                className={styles.filterSelect}
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterGroup}>
              <span className={styles.filterLabel}>Sort by</span>
              <select
                className={styles.filterSelect}
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="title">Title A–Z</option>
                <option value="price-low">Price: Low to high</option>
                <option value="price-high">Price: High to low</option>
              </select>
            </label>

            <div className={styles.filterActions}>
              <button
                type="button"
                className={styles.clearButton}
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
        </section>

        <div className={styles.resultsBar}>
          <p className={styles.resultsCount}>
            <strong>{filteredBooks.length}</strong>{" "}
            {filteredBooks.length === 1 ? "book" : "books"}
          </p>
        </div>

        {loading ? (
          <div className={styles.statePanel}>
            <span className={styles.spinner} />
            <p>Loading books...</p>
          </div>
        ) : error ? (
          <div className={styles.statePanel}>
            <h2>Books are unavailable right now.</h2>
            <p>Please try again in a moment.</p>
            <button
              className={styles.clearButton}
              onClick={() => dispatch(fetchBooks())}
            >
              Try again
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className={styles.statePanel}>
            <h2>No books found.</h2>
            <p>Try another search or clear your filters.</p>
            <button className={styles.clearButton} onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <section className={styles.bookGrid} aria-label="Books">
            {filteredBooks.map((book) => (
              <BookCard
                key={idOf(book)}
                book={book}
                user={user}
                accessToken={accessToken}
                cartItems={cartItems}
                wishlistBooks={wishlistBooks}
                wishlistLoadingId={wishlistLoadingId}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
