"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import api from "@/lib/axios";
import styles from "./books.module.css";

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export default function AdminBooksPage() {
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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/books");
    }
  }, [initialized, restoring, accessToken, user, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadBooks = useCallback(async () => {
    if (!initialized || restoring || !accessToken || user?.role !== "admin") {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get("/books", {
        params: {
          page,
          limit: 10,
          search,
          sortBy: "createdAt",
          order: "desc",
        },
      });

      const payload = response.data;
      const result = payload?.data;

      if (!Array.isArray(result)) {
        throw new Error("The books API returned an unexpected response.");
      }

      setBooks(result);
      setTotalBooks(payload.total ?? result.length);
      setTotalPages(Math.max(1, payload.totalPages ?? 1));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [initialized, restoring, accessToken, user, page, search]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  function openDeleteModal(book) {
    setError("");
    setNotice("");
    setBookToDelete(book);
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setBookToDelete(null);
  }

  async function handleDelete() {
    if (!bookToDelete || deletingId) return;

    const book = bookToDelete;
    setDeletingId(book._id);
    setError("");
    setNotice("");

    try {
      await api.delete(`/books/${book._id}`);

      setBookToDelete(null);
      setNotice(`"${book.title}" was deleted successfully.`);

      if (books.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await loadBooks();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!bookToDelete) return;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !deletingId) {
        setBookToDelete(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bookToDelete, deletingId]);

  if (!initialized || restoring || !accessToken || user?.role !== "admin") {
    return (
      <main className={styles.loading} role="status">
        Loading admin book management...
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin/dashboard" className={styles.backLink}>
          <span aria-hidden="true">←</span>
          Back to dashboard
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>CHAPTER. ADMINISTRATION</p>
            <h1>Manage Books</h1>
            <p className={styles.subtitle}>
              Manage your bookstore catalogue from one place.
            </p>
          </div>

          <Link href="/admin/books/add" className={styles.addButton}>
            <span aria-hidden="true">＋</span> Add a Book
          </Link>
        </header>

        <section className={styles.toolbar}>
          <div>
            <p className={styles.countLabel}>BOOK CATALOGUE</p>
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
              placeholder="Search title or author..."
              aria-label="Search books by title or author"
            />
          </label>
        </section>

        {error && (
          <div className={styles.alert} role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className={styles.success} role="status">
            {notice}
          </div>
        )}

        <section className={styles.tableCard}>
          {loading ? (
            <div className={styles.emptyState} role="status">
              Loading books...
            </div>
          ) : books.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">
                B
              </span>

              <h3>{search ? "No books found" : "Your catalogue is empty"}</h3>

              <p>
                {search
                  ? "Try a different title or author."
                  : "Add your first book to get started."}
              </p>

              {!search && (
                <Link href="/admin/books/add" className={styles.addButton}>
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
                                src={book.coverImage}
                                alt={`Cover of ${book.title}`}
                                className={styles.cover}
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
                            {book.category || "Uncategorized"}
                          </span>
                        </td>

                        <td className={styles.price}>
                          ₹{Number(book.price || 0).toLocaleString("en-IN")}
                        </td>

                        <td>{book.stock ?? 0}</td>

                        <td>
                          <div className={styles.actions}>
                            <Link
                              href={`/admin/books/${book._id}/edit`}
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
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
          >
            <div className={styles.modalIcon} aria-hidden="true">
              !
            </div>

            <p className={styles.modalEyebrow}>CONFIRM DELETION</p>

            <h2 id="delete-modal-title">Delete this book?</h2>

            <p id="delete-modal-description" className={styles.modalDescription}>
              Are you sure you want to delete{" "}
              <strong className={styles.modalBookTitle}>
                &ldquo;{bookToDelete.title}&rdquo;
              </strong>
              ? This action cannot be undone.
            </p>

            {error && (
              <div className={styles.modalError} role="alert">
                {error}
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