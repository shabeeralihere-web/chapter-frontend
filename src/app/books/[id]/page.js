
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { addToCart, fetchCart } from "@/store/cart/cartThunks";

import {
  fetchWishlist,
  addToWishlist,
  removeFromWishlist,
} from "@/store/wishlist/wishlistSlice";

import "./page.css";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

function getBookId(book) {
  return String(book?._id || book?.id || "");
}

function getTitle(book) {
  return book?.title || book?.name || "Untitled book";
}

function getAuthor(book) {
  const author = book?.author || book?.authors;

  if (Array.isArray(author)) {
    return author.join(", ") || "Unknown author";
  }

  return author || "Unknown author";
}

function getCategories(book) {
  const categories = book?.categories;

  if (Array.isArray(categories)) {
    return categories
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.name || item?.title || ""
      )
      .filter(Boolean);
  }

  const category = book?.category || book?.genre;

  if (Array.isArray(category)) {
    return category.filter(Boolean);
  }

  return category ? [category] : [];
}

function getCoverImage(book) {
  const image =
    book?.coverImage ||
    book?.imageUrl ||
    book?.image ||
    book?.thumbnail ||
    book?.bookImage;

  if (typeof image === "string") return image;

  if (image && typeof image === "object") {
    return image.url || image.secure_url || "";
  }

  return "";
}

function getPrice(book) {
  const rawPrice = book?.price ?? book?.sellingPrice;

  if (
    rawPrice === null ||
    rawPrice === undefined ||
    rawPrice === ""
  ) {
    return null;
  }

  const price = Number(rawPrice);

  return Number.isFinite(price) && price >= 0 ? price : null;
}

function formatPrice(price) {
  if (price === null) return "Price unavailable";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);
}

function getStock(book) {
  const value = book?.stock ?? book?.quantity;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const stock = Number(value);
  return Number.isFinite(stock) ? stock : null;
}

function getUserId(user) {
  return String(
    user?._id ||
      user?.id ||
      user?.userId ||
      user?.user?._id ||
      user?.user?.id ||
      ""
  );
}

function getSellerId(book) {
  const seller = book?.seller || book?.sellerId || book?.owner;

  if (typeof seller === "string" || typeof seller === "number") {
    return String(seller);
  }

  return String(
    seller?._id ||
      seller?.id ||
      seller?.userId ||
      book?.seller?._id ||
      ""
  );
}

function getCartBookId(item) {
  const book = item?.book || item?.product;

  if (typeof book === "string" || typeof book === "number") {
    return String(book);
  }

  return String(
    book?._id ||
      book?.id ||
      item?.bookId?._id ||
      item?.bookId?.id ||
      item?.bookId ||
      item?.productId?._id ||
      item?.productId?.id ||
      item?.productId ||
      ""
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function DetailItem({ label, value }) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  return (
    <div className="bookDetailItem">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CartModal({ modal, onClose, onGoToCart }) {
  useEffect(() => {
    if (!modal) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modal, onClose]);

  if (!modal) return null;

  const wasAdded = modal.type === "added";

  return (
    <div
      className="bookCartModalBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="bookCartModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookCartModalTitle"
        aria-describedby="bookCartModalDescription"
      >
        <button
          type="button"
          className="bookCartModalClose"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>

        <div
          className={`bookCartModalIcon ${
            wasAdded ? "bookCartModalIconSuccess" : ""
          }`}
          aria-hidden="true"
        >
          {wasAdded ? "✓" : "i"}
        </div>

        <p className="bookCartModalEyebrow">
          {wasAdded ? "ADDED TO CART" : "ALREADY IN YOUR CART"}
        </p>

        <h2 id="bookCartModalTitle">
          {wasAdded
            ? "Book added to your cart"
            : "This book is already in your cart"}
        </h2>

        <p id="bookCartModalDescription" className="bookCartModalText">
          <strong>{modal.title}</strong>
          {wasAdded
            ? " is ready for you whenever you want to check out."
            : " is already there. You can visit your cart to review the quantity or continue browsing."}
        </p>

        <div className="bookCartModalActions">
          <button
            type="button"
            className="bookCartModalPrimary"
            onClick={onGoToCart}
          >
            Go to cart
          </button>

          <button
            type="button"
            className="bookCartModalSecondary"
            onClick={onClose}
          >
            Continue browsing
          </button>
        </div>
      </section>
    </div>
  );
}

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const bookId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  // Authentication state
  const user = useSelector((state) => state.auth?.user);
  const accessToken = useSelector(
    (state) => state.auth?.accessToken
  );
  const authInitialized = useSelector(
    (state) => state.auth?.initialized
  );

  // Cart state
  const cartItems = useSelector(
    (state) => state.cart?.items || []
  );

  // Wishlist state
  const wishlistBooks = useSelector(
    (state) => state.wishlist?.books || []
  );
  const wishlistLoading = useSelector(
    (state) => state.wishlist?.loading || false
  );

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [modal, setModal] = useState(null);

  // Load book details
  useEffect(() => {
    if (!bookId) return;

    const controller = new AbortController();

    async function loadBook() {
      setLoading(true);
      setError("");
      setBook(null);
      setImageFailed(false);

      try {
        const response = await fetch(
          `${API_URL}/books/${encodeURIComponent(bookId)}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.message ||
              (response.status === 404
                ? "This book could not be found."
                : "Unable to load this book.")
          );
        }

        const result = data?.book ?? data?.data ?? data;

        if (
          !result ||
          typeof result !== "object" ||
          Array.isArray(result) ||
          !getBookId(result)
        ) {
          throw new Error("The server returned an invalid book.");
        }

        setBook(result);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(
            requestError?.message ||
              "Something went wrong while loading this book."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadBook();

    return () => controller.abort();
  }, [bookId]);

  // Load cart for the signed-in user
  useEffect(() => {
    if (authInitialized && accessToken && user) {
      dispatch(fetchCart());
    }
  }, [dispatch, authInitialized, accessToken, user]);

  // Load wishlist for the signed-in user
  useEffect(() => {
    if (authInitialized && accessToken && user) {
      dispatch(fetchWishlist());
    }
  }, [dispatch, authInitialized, accessToken, user]);

  const handleCloseModal = useCallback(() => {
    setModal(null);
  }, []);

  function handleGoToCart() {
    setModal(null);
    router.push("/cart");
  }

  // Add book to cart
  async function handleAddToCart() {
    if (!book || addingToCart) return;

    if (!accessToken || !user) {
      const redirect = `/books/${encodeURIComponent(bookId)}`;

      router.push(
        `/login?redirect=${encodeURIComponent(redirect)}`
      );
      return;
    }

    const role = String(user?.role || "").toLowerCase();
    const currentUserId = getUserId(user);
    const sellerId = getSellerId(book);

    const isOwnBook =
      role === "seller" &&
      currentUserId &&
      sellerId &&
      currentUserId === sellerId;

    if (isOwnBook) {
      toast.info("You cannot purchase your own book.");
      return;
    }

    const stock = getStock(book);
    const price = getPrice(book);

    if (stock !== null && stock <= 0) {
      toast.error("This book is currently out of stock.");
      return;
    }

    if (price === null) {
      toast.error("This book's price is currently unavailable.");
      return;
    }

    const alreadyInCart = cartItems.some(
      (item) => getCartBookId(item) === getBookId(book)
    );

    if (alreadyInCart) {
      setModal({
        type: "existing",
        title: getTitle(book),
      });
      return;
    }

    setAddingToCart(true);

    try {
      await dispatch(
        addToCart({
          bookId: getBookId(book),
          quantity: 1,
        })
      ).unwrap();

      setModal({
        type: "added",
        title: getTitle(book),
      });

      dispatch(fetchCart());
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      const normalizedMessage = message.toLowerCase();

      if (
        normalizedMessage.includes("already in cart") ||
        normalizedMessage.includes("already added")
      ) {
        setModal({
          type: "existing",
          title: getTitle(book),
        });

        dispatch(fetchCart());
      } else {
        toast.error(message);
      }
    } finally {
      setAddingToCart(false);
    }
  }

  // Add or remove the current book from wishlist
  async function handleToggleWishlist() {
    if (!book || togglingWishlist) return;

    if (!accessToken || !user) {
      const redirect = `/books/${encodeURIComponent(bookId)}`;

      router.push(
        `/login?redirect=${encodeURIComponent(redirect)}`
      );
      return;
    }

    const currentBookId = getBookId(book);

    const isAlreadySaved = wishlistBooks.some(
      (item) => getBookId(item) === currentBookId
    );

    setTogglingWishlist(true);

    try {
      if (isAlreadySaved) {
        await dispatch(
          removeFromWishlist(currentBookId)
        ).unwrap();

        toast.success("Removed from your wishlist.");
      } else {
        await dispatch(
          addToWishlist(currentBookId)
        ).unwrap();

        toast.success("Added to your wishlist.");
      }
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
    } finally {
      setTogglingWishlist(false);
    }
  }

  if (loading) {
    return (
      <main className="bookDetailsPage">
        <div className="bookDetailsContainer">
          <nav className="bookDetailsBreadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/books">All books</Link>
            <span>/</span>
            <span>Book details</span>
          </nav>

          <div className="bookDetailsLoading" aria-live="polite">
            <div className="bookDetailsSkeletonCover" />
            <div className="bookDetailsSkeletonContent">
              <div />
              <div />
              <div />
              <div />
              <div />
            </div>
          </div>

          <p className="bookDetailsLoadingText">
            Loading book details...
          </p>
        </div>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="bookDetailsPage">
        <div className="bookDetailsContainer">
          <nav className="bookDetailsBreadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/books">All books</Link>
            <span>/</span>
            <span>Book details</span>
          </nav>

          <section className="bookDetailsMessage" aria-live="polite">
            <span className="bookDetailsMessageIcon" aria-hidden="true">
              !
            </span>
            <h1>Book unavailable</h1>
            <p>
              {error ||
                "This book may have been removed or is unavailable."}
            </p>
            <Link href="/books" className="bookDetailsPrimaryLink">
              Browse all books
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const title = getTitle(book);
  const author = getAuthor(book);
  const categories = getCategories(book);
  const coverImage = getCoverImage(book);
  const price = getPrice(book);
  const stock = getStock(book);

  const description =
    book.description ||
    book.summary ||
    "No description is available for this book yet.";

  const isOutOfStock = stock !== null && stock <= 0;
  const isPriceUnavailable = price === null;

  const role = String(user?.role || "").toLowerCase();
  const currentUserId = getUserId(user);
  const sellerId = getSellerId(book);

  const isOwnBook =
    role === "seller" &&
    Boolean(currentUserId) &&
    Boolean(sellerId) &&
    currentUserId === sellerId;

  const alreadyInCart = cartItems.some(
    (item) => getCartBookId(item) === getBookId(book)
  );

  const isInWishlist = wishlistBooks.some(
    (item) => getBookId(item) === getBookId(book)
  );

  const canPurchase =
    !isOwnBook &&
    !isOutOfStock &&
    !isPriceUnavailable;

  return (
    <main className="bookDetailsPage">
      <div className="bookDetailsContainer">
        <nav className="bookDetailsBreadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/books">All books</Link>
          <span aria-hidden="true">/</span>
          <span className="bookDetailsBreadcrumbCurrent">
            {title}
          </span>
        </nav>

        <section className="bookDetailsMain">
          <div className="bookDetailsCoverColumn">
            <div className="bookDetailsCover">
              {coverImage && !imageFailed ? (
                <img
                  src={coverImage}
                  alt={`Cover of ${title}`}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="bookDetailsCoverFallback">
                  <span className="bookDetailsFallbackMark">
                    Chapter.
                  </span>
                  <span className="bookDetailsFallbackTitle">
                    {title}
                  </span>
                  <span className="bookDetailsFallbackAuthor">
                    {author}
                  </span>
                </div>
              )}
            </div>

            <p className="bookDetailsCoverCaption">
              Discover a book that stays with you.
            </p>
          </div>

          <div className="bookDetailsInformation">
            <p className="bookDetailsEyebrow">BOOK DETAILS</p>

            {categories.length > 0 && (
              <div className="bookDetailsCategories">
                {categories.map((category, index) => (
                  <span
                    className="bookDetailsCategory"
                    key={`${category}-${index}`}
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}

            <h1 className="bookDetailsTitle">{title}</h1>

            <p className="bookDetailsAuthor">
              By <span>{author}</span>
            </p>

            <div className="bookDetailsPriceBlock">
              <p className="bookDetailsPriceLabel">Price</p>
              <p className="bookDetailsPrice">
                {formatPrice(price)}
              </p>

              {stock !== null && (
                <span
                  className={`bookDetailsStock ${
                    isOutOfStock
                      ? "bookDetailsStockOut"
                      : stock <= 5
                        ? "bookDetailsStockLow"
                        : "bookDetailsStockAvailable"
                  }`}
                >
                  {isOutOfStock
                    ? "Out of stock"
                    : stock <= 5
                      ? `Only ${stock} left in stock`
                      : "Available"}
                </span>
              )}
            </div>

            <section className="bookDetailsDescription">
              <h2>About this book</h2>
              <p>{description}</p>
            </section>

            <div className="bookDetailsActions">
              {isOwnBook ? (
                <div className="bookDetailsOwnBookNotice">
                  This is your book. You cannot purchase your own listing.
                </div>
              ) : (
                <button
                  type="button"
                  className="bookDetailsAddButton"
                  onClick={handleAddToCart}
                  disabled={!canPurchase || addingToCart}
                >
                  {isOutOfStock
                    ? "Out of stock"
                    : isPriceUnavailable
                      ? "Price unavailable"
                      : addingToCart
                        ? "Adding to cart..."
                        : alreadyInCart
                          ? "View cart options"
                          : "Add to cart"}
                </button>
              )}

              <button
                type="button"
                className={`bookDetailsWishlistButton ${
                  isInWishlist
                    ? "bookDetailsWishlistActive"
                    : ""
                }`}
                onClick={handleToggleWishlist}
                disabled={togglingWishlist || wishlistLoading}
                aria-pressed={isInWishlist}
                aria-label={
                  isInWishlist
                    ? "Remove this book from your wishlist"
                    : "Add this book to your wishlist"
                }
              >
                <span
                  className="bookDetailsWishlistHeart"
                  aria-hidden="true"
                >
                  {isInWishlist ? "♥" : "♡"}
                </span>

                <span>
                  {togglingWishlist
                    ? "Updating wishlist..."
                    : isInWishlist
                      ? "Already in wishlist"
                      : "Add to wishlist"}
                </span>
              </button>

              <Link
                href="/books"
                className="bookDetailsBackLink"
              >
                Continue browsing
              </Link>
            </div>

            <p className="bookDetailsCartHint">
              {isOwnBook
                ? "Manage your listing from your seller dashboard."
                : alreadyInCart
                  ? "This book is already in your cart."
                  : "You can review your selected books before checkout."}
            </p>
          </div>
        </section>

        <section
          className="bookDetailsMore"
          aria-labelledby="bookDetailsMoreHeading"
        >
          <div className="bookDetailsSectionHeading">
            <p className="bookDetailsEyebrow">BOOK INFORMATION</p>
            <h2 id="bookDetailsMoreHeading">
              More about this book
            </h2>
            <p>
              Browse the key details to help you decide if this is
              the right read for you.
            </p>
          </div>

          <dl className="bookDetailsMetadata">
            <DetailItem label="Title" value={title} />
            <DetailItem label="Author" value={author} />
            <DetailItem
              label="Publisher"
              value={book.publisher || book.publishedBy}
            />
            <DetailItem
              label="ISBN"
              value={book.isbn || book.ISBN}
            />
            <DetailItem
              label="Pages"
              value={book.pages ?? book.pageCount}
            />
            <DetailItem
              label="Publication year"
              value={book.publicationYear || book.publishedYear}
            />
            <DetailItem label="Language" value={book.language} />
            <DetailItem label="Edition" value={book.edition} />
            <DetailItem
              label="Format"
              value={book.format || book.bookFormat}
            />
            <DetailItem
              label="Category"
              value={categories.length ? categories.join(", ") : null}
            />
            <DetailItem
              label="Availability"
              value={
                isOutOfStock
                  ? "Out of stock"
                  : stock === null
                    ? "Not specified"
                    : `${stock} available`
              }
            />
          </dl>
        </section>

        <section className="bookDetailsClosing">
          <div>
            <p className="bookDetailsEyebrow">KEEP EXPLORING</p>
            <h2>There is always another good book to discover.</h2>
            <p>
              Return to the catalogue and find your next favourite read.
            </p>
          </div>

          <Link
            href="/books"
            className="bookDetailsClosingLink"
          >
            Explore all books <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>

      <CartModal
        modal={modal}
        onClose={handleCloseModal}
        onGoToCart={handleGoToCart}
      />
    </main>
  );
}
