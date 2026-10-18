
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import api from "@/lib/axios";
import styles from "../../admin/books/books.module.css";

function getErrorMessage(error) {
  if (error.response?.status === 401) {
    return "Your session may have expired. Please sign in again.";
  }

  if (error.response?.status === 403) {
    return (
      error.response?.data?.message ||
      "Your seller account may not be approved yet."
    );
  }

  return (
    error.response?.data?.message ||
    "Unable to load your books. Please try again."
  );
}

function unwrapBooks(response) {
  const payload = response?.data;

  return {
    books: Array.isArray(payload?.data) ? payload.data : [],
    total: Number(payload?.total ?? payload?.totalBooks ?? 0),
    totalPages: Math.max(1, Number(payload?.totalPages ?? 1)),
  };
}

export default function SellerBooksPage() {
  const router = useRouter();

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [books, setBooks] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadBooks = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/books/my-books", {
        params: {
          page,
          limit: 10,
          search,
        },
      });

      const result = unwrapBooks(response);

      setBooks(result.books);
      setTotalBooks(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    if (user?.role === "admin") {
      router.replace("/admin/books");
      return;
    }

    if (user?.role !== "seller") {
      router.replace("/books");
      return;
    }

    loadBooks();
  }, [
    initialized,
    restoring,
    accessToken,
    user?.role,
    router,
    loadBooks,
  ]);

  function openDeleteModal(book) {
    setDeleteError("");
    setBookToDelete(book);
  }

  function closeDeleteModal() {
    if (deletingId) return;

    setBookToDelete(null);
    setDeleteError("");
  }

  async function handleDelete() {
    if (!bookToDelete || deletingId) return;

    const book = bookToDelete;

    setDeletingId(book._id);
    setDeleteError("");

    try {
      await api.delete(`/books/${book._id}`);

      toast.success("Book deleted successfully.");
      setBookToDelete(null);

      if (books.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await loadBooks();
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Unable to delete this book. Please try again.";

      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!bookToDelete) return;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !deletingId) {
        setBookToDelete(null);
        setDeleteError("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [bookToDelete, deletingId]);

  if (!initialized || restoring || !accessToken || user?.role !== "seller") {
    return (
      <main className={styles.page}>
        <div className={styles.loading} role="status">
          Loading your books...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/seller/dashboard" className={styles.backLink}>
          <span aria-hidden="true">←</span>
          Seller dashboard
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>SELLER CENTRE</p>
            <h1>My Books</h1>
            <p className={styles.subtitle}>
              Manage your listings, update book details, and keep your
              catalogue up to date.
            </p>
          </div>

          <Link href="/seller/books/add" className={styles.addButton}>
            <span aria-hidden="true">＋</span> Add a book
          </Link>
        </header>

        <section className={styles.toolbar}>
          <div>
            <p className={styles.countLabel}>YOUR CATALOGUE</p>
            <h2>
              {totalBooks} {totalBooks === 1 ? "book" : "books"}
            </h2>
          </div>

          <label className={styles.searchBox}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search your books..."
              aria-label="Search your books"
            />
          </label>
        </section>

        <section className={styles.tableCard}>
          {loading ? (
            <div className={styles.loading} role="status">
              Loading your books...
            </div>
          ) : books.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">
                B
              </span>

              <h3>
                {search ? "No matching books" : "Your catalogue is empty"}
              </h3>

              <p>
                {search
                  ? "Try a different title, author, ISBN, or category."
                  : "Add your first book to start building your seller catalogue."}
              </p>

              {!search && (
                <Link href="/seller/books/add" className={styles.addButton}>
                  Add your first book
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {books.map((book) => (
                      <tr key={book._id}>
                        <td>
                          <div className={styles.bookCell}>
                            {book.coverImage ? (
                              <img
                                className={styles.cover}
                                src={book.coverImage}
                                alt={`Cover of ${book.title}`}
                              />
                            ) : (
                              <div
                                className={styles.coverPlaceholder}
                                aria-label="No cover image"
                              >
                                B
                              </div>
                            )}

                            <div className={styles.bookInfo}>
                              <strong>{book.title}</strong>
                              <span>{book.author}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={styles.category}>
                            {book.category || book.categories?.[0] || "Other"}
                          </span>
                        </td>

                        <td className={styles.price}>
                          ₹{Number(book.price || 0).toFixed(2)}
                        </td>

                        <td>{book.stock ?? 0}</td>

                        <td>
                          <div className={styles.actions}>
                            <Link
                              href={`/seller/books/${book._id}/edit`}
                              className={styles.editButton}
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              className={styles.deleteButton}
                              disabled={Boolean(deletingId)}
                              onClick={() => openDeleteModal(book)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.pagination}>
                <span>
                  Page {page} of {totalPages}
                </span>

                <div className={styles.pageActions}>
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {bookToDelete && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <section
            className={styles.modal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="seller-delete-title"
            aria-describedby="seller-delete-description"
          >
            <div className={styles.modalIcon} aria-hidden="true">
              !
            </div>

            <p className={styles.modalEyebrow}>CONFIRM DELETION</p>

            <h2 id="seller-delete-title">Delete this book?</h2>

            <p
              id="seller-delete-description"
              className={styles.modalDescription}
            >
              Are you sure you want to delete{" "}
              <strong className={styles.modalBookTitle}>
                &ldquo;{bookToDelete.title}&rdquo;
              </strong>
              ? This action cannot be undone.
            </p>

            {deleteError && (
              <div className={styles.modalError} role="alert">
                {deleteError}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModalButton}
                onClick={closeDeleteModal}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={handleDelete}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? "Deleting..." : "Delete book"}
              </button>
            </div>

            <p className={styles.modalFootnote}>
              This action permanently removes the book from your catalogue.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
