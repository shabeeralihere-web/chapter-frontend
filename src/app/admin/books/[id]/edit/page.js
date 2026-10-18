
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import api from "@/lib/axios";
import styles from "../../add/add-book.module.css";

const BOOK_CATEGORIES = [
  "Fiction",
  "Mystery & Thriller",
  "Romance",
  "Fantasy",
  "Science Fiction",
  "Biography & Memoir",
  "Self-Help",
  "Business & Economics",
  "Education & Textbooks",
  "History",
  "Philosophy",
  "Poetry",
  "Children's Books",
  "Comics & Graphic Novels",
  "Technology",
  "Other",
];

const FORMATS = [
  "Paperback",
  "Hardcover",
  "eBook",
  "Audiobook",
  "Other",
];

const initialForm = {
  title: "",
  author: "",
  description: "",
  price: "",
  stock: "0",
  pages: "",
  isbn: "",
  publisher: "",
  publicationYear: "",
  language: "English",
  edition: "",
  format: "",
};

function getFriendlyError(error) {
  const data = error.response?.data;

  const validationMessage = data?.errors
    ?.map((item) => item.message)
    .filter(Boolean)
    .join(" ");

  const message = validationMessage || data?.message;

  if (
    message &&
    !/cloudinary|mongodb|mongoose|multer|stack trace|internal server/i.test(
      message
    )
  ) {
    return message;
  }

  if (!error.response) {
    return "We couldn't connect right now. Please check your connection and try again.";
  }

  if (error.response.status === 401) {
    return "Your session may have expired. Please sign in again.";
  }

  if (error.response.status === 403) {
    return "You don't have permission to edit this book.";
  }

  if (error.response.status === 404) {
    return "This book could not be found. It may have been removed.";
  }

  if (error.response.status === 413) {
    return "The selected image is too large. Please choose a smaller image.";
  }

  return "We couldn't save your changes. Please try again.";
}

export default function EditBookPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params?.id;

  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [existingCover, setExistingCover] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [showAdditional, setShowAdditional] = useState(false);
  const [loadingBook, setLoadingBook] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    if (!initialized || restoring || !accessToken || user?.role !== "admin") {
      return;
    }

    if (!bookId) return;

    let cancelled = false;

    async function loadBook() {
      setLoadingBook(true);
      setError("");

      try {
        const response = await api.get(`/books/${bookId}`);
        const book = response.data?.data;

        if (!book) {
          throw new Error("BOOK_NOT_FOUND");
        }

        if (cancelled) return;

        setForm({
          title: book.title ?? "",
          author: book.author ?? "",
          description: book.description ?? "",
          price: book.price == null ? "" : String(book.price),
          stock: book.stock == null ? "0" : String(book.stock),
          pages: book.pages == null ? "" : String(book.pages),
          isbn: book.isbn ?? "",
          publisher: book.publisher ?? "",
          publicationYear:
            book.publicationYear == null
              ? ""
              : String(book.publicationYear),
          language: book.language ?? "English",
          edition: book.edition ?? "",
          format: book.format ?? "",
        });

        const savedCategories =
          Array.isArray(book.categories) && book.categories.length > 0
            ? book.categories
            : book.category
              ? [book.category]
              : [];

        setCategories(savedCategories);
        setExistingCover(book.coverImage ?? "");
        setCoverImage(null);
      } catch (err) {
        if (cancelled) return;

        setError(
          err.message === "BOOK_NOT_FOUND"
            ? "We couldn't find this book."
            : getFriendlyError(err)
        );
      } finally {
        if (!cancelled) setLoadingBook(false);
      }
    }

    loadBook();

    return () => {
      cancelled = true;
    };
  }, [initialized, restoring, accessToken, user, user?.role, bookId]);

  useEffect(() => {
    if (!coverImage) {
      setPreview("");
      return;
    }

    const imageUrl = URL.createObjectURL(coverImage);
    setPreview(imageUrl);

    return () => URL.revokeObjectURL(imageUrl);
  }, [coverImage]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function toggleCategory(category) {
    setCategories((previous) =>
      previous.includes(category)
        ? previous.filter((item) => item !== category)
        : [...previous, category]
    );
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    setError("");
    setCoverImage(null);

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The book cover must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setCoverImage(file);
  }

  function removeNewImage() {
    setCoverImage(null);

    const input = document.getElementById("coverImage");
    if (input) input.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Please enter the book title.");
      return;
    }

    if (!form.author.trim()) {
      setError("Please enter the author's name.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please add a short description of the book.");
      return;
    }

    if (
      form.price.trim() === "" ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      setError("Please enter a valid selling price.");
      return;
    }

    if (
      form.stock.trim() === "" ||
      !Number.isInteger(Number(form.stock)) ||
      Number(form.stock) < 0
    ) {
      setError("Available copies must be zero or a whole number.");
      return;
    }

    if (categories.length === 0) {
      setError("Please choose at least one book category.");
      return;
    }

    if (
      form.pages !== "" &&
      (!Number.isInteger(Number(form.pages)) || Number(form.pages) < 1)
    ) {
      setError("Page count must be a whole number greater than zero.");
      setShowAdditional(true);
      return;
    }

    if (
      form.publicationYear !== "" &&
      (!Number.isInteger(Number(form.publicationYear)) ||
        Number(form.publicationYear) < 1000 ||
        Number(form.publicationYear) > 2100)
    ) {
      setError("Please enter a valid publication year.");
      setShowAdditional(true);
      return;
    }

    const formData = new FormData();

    formData.append("title", form.title.trim());
    formData.append("author", form.author.trim());
    formData.append("description", form.description.trim());
    formData.append("price", form.price);
    formData.append("stock", form.stock);

    // Keep the older category field in sync with the selected categories.
    formData.append("category", categories[0]);
    formData.append("categories", JSON.stringify(categories));

    // Send empty strings too, so optional fields can be cleared.
    formData.append("pages", form.pages);
    formData.append("isbn", form.isbn.trim());
    formData.append("publisher", form.publisher.trim());
    formData.append("publicationYear", form.publicationYear);
    formData.append("language", form.language.trim());
    formData.append("edition", form.edition.trim());
    formData.append("format", form.format);

    if (coverImage) {
      formData.append("coverImage", coverImage);
    }

    try {
      setLoading(true);

      await api.patch(`/books/${bookId}`, formData, {
        headers: { "Content-Type": undefined },
      });

      setSuccess("Your book has been updated successfully.");

      window.setTimeout(() => {
        router.push("/admin/books");
      }, 900);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  if (!initialized || restoring || !user || user.role !== "admin") {
    return <div className={styles.loading}>Getting things ready…</div>;
  }

  if (loadingBook) {
    return <div className={styles.loading}>Loading book details…</div>;
  }

  const displayedCover = preview || existingCover;

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/admin/dashboard">Admin dashboard</Link>
          <span>/</span>
          <Link href="/admin/books">Manage books</Link>
          <span>/</span>
          <span>Edit book</span>
        </nav>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>BOOK COLLECTION</p>
            <h1>Edit book</h1>
            <p>
              Update the book details below. Your changes will appear in the
              store after you save them.
            </p>
          </div>

          <Link href="/admin/books" className={styles.backLink}>
            ← Back to books
          </Link>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.mainColumn}>
              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>01</span>
                  <div>
                    <h2>Book details</h2>
                    <p>Update the information readers need most.</p>
                  </div>
                </div>

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label htmlFor="title">Book title *</label>
                    <input
                      id="title"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      maxLength={150}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="author">Author *</label>
                    <input
                      id="author"
                      name="author"
                      value={form.author}
                      onChange={handleChange}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="description">About this book *</label>
                    <textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      maxLength={3000}
                      rows={5}
                      required
                    />
                    <span className={styles.hint}>
                      {form.description.length}/3000 characters
                    </span>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>02</span>
                  <div>
                    <h2>Choose categories</h2>
                    <p>Select all that describe this book.</p>
                  </div>
                </div>

                <div className={styles.categoryGrid}>
                  {BOOK_CATEGORIES.map((category) => {
                    const selected = categories.includes(category);

                    return (
                      <button
                        key={category}
                        type="button"
                        className={`${styles.categoryChip} ${
                          selected ? styles.categoryChipSelected : ""
                        }`}
                        aria-pressed={selected}
                        onClick={() => toggleCategory(category)}
                      >
                        <span className={styles.chipCheck} aria-hidden="true">
                          {selected ? "✓" : "+"}
                        </span>
                        {category}
                      </button>
                    );
                  })}
                </div>

                <p className={styles.selectionHint}>
                  {categories.length === 0
                    ? "Choose at least one category."
                    : `${categories.length} ${
                        categories.length === 1 ? "category" : "categories"
                      } selected`}
                </p>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>03</span>
                  <div>
                    <h2>Price and availability</h2>
                    <p>Update the selling price and available copies.</p>
                  </div>
                </div>

                <div className={styles.twoColumns}>
                  <div className={styles.field}>
                    <label htmlFor="price">Selling price (₹) *</label>
                    <div className={styles.inputWithPrefix}>
                      <span>₹</span>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="stock">Available copies *</label>
                    <input
                      id="stock"
                      name="stock"
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={handleChange}
                      required
                    />
                    <span className={styles.fieldHint}>
                      Enter 0 if currently unavailable.
                    </span>
                  </div>
                </div>
              </section>

              <section className={styles.additionalSection}>
                <button
                  type="button"
                  className={styles.additionalToggle}
                  onClick={() => setShowAdditional((previous) => !previous)}
                  aria-expanded={showAdditional}
                  aria-controls="additional-information"
                >
                  <span className={styles.additionalIcon}>＋</span>
                  <span className={styles.additionalText}>
                    <strong>Additional information</strong>
                    <small>
                      Pages, publisher, ISBN and other details · Optional
                    </small>
                  </span>
                  <span className={styles.chevron}>
                    {showAdditional ? "−" : "+"}
                  </span>
                </button>

                {showAdditional && (
                  <div
                    id="additional-information"
                    className={styles.additionalContent}
                  >
                    <p className={styles.additionalIntro}>
                      Update any details you know. You can leave fields blank.
                    </p>

                    <div className={styles.twoColumns}>
                      <div className={styles.field}>
                        <label htmlFor="pages">Number of pages</label>
                        <input
                          id="pages"
                          name="pages"
                          type="number"
                          min="1"
                          step="1"
                          value={form.pages}
                          onChange={handleChange}
                          placeholder="e.g. 320"
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="publicationYear">Year published</label>
                        <input
                          id="publicationYear"
                          name="publicationYear"
                          type="number"
                          min="1000"
                          max="2100"
                          step="1"
                          value={form.publicationYear}
                          onChange={handleChange}
                          placeholder="e.g. 2024"
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="isbn">ISBN</label>
                        <input
                          id="isbn"
                          name="isbn"
                          value={form.isbn}
                          onChange={handleChange}
                          maxLength={20}
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="publisher">Publisher</label>
                        <input
                          id="publisher"
                          name="publisher"
                          value={form.publisher}
                          onChange={handleChange}
                          maxLength={150}
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="language">Language</label>
                        <input
                          id="language"
                          name="language"
                          value={form.language}
                          onChange={handleChange}
                          maxLength={50}
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="edition">Edition</label>
                        <input
                          id="edition"
                          name="edition"
                          value={form.edition}
                          onChange={handleChange}
                          maxLength={100}
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="format">Book format</label>
                        <select
                          id="format"
                          name="format"
                          value={form.format}
                          onChange={handleChange}
                        >
                          <option value="">Choose a format</option>
                          {FORMATS.map((format) => (
                            <option key={format} value={format}>
                              {format}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <aside className={styles.imageSection}>
              <div className={styles.imageHeading}>
                <span className={styles.imageStep}>04</span>
                <div>
                  <h2>Book cover</h2>
                  <p>Keep the current cover or choose a replacement.</p>
                </div>
              </div>

              <div className={styles.imagePreview}>
                {displayedCover ? (
                  <img src={displayedCover} alt="Book cover preview" />
                ) : (
                  <div className={styles.emptyPreview}>
                    <span className={styles.imageIcon}>＋</span>
                    <strong>No cover image</strong>
                    <small>You can add one below.</small>
                  </div>
                )}
              </div>

              <label className={styles.uploadButton} htmlFor="coverImage">
                {coverImage ? "Choose a different image" : "Replace book cover"}
              </label>

              <input
                className={styles.fileInput}
                id="coverImage"
                name="coverImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />

              {coverImage && (
                <div className={styles.selectedFile}>
                  <span className={styles.fileName}>{coverImage.name}</span>
                  <button
                    type="button"
                    className={styles.removeImage}
                    onClick={removeNewImage}
                  >
                    Undo replacement
                  </button>
                </div>
              )}

              <p className={styles.uploadHint}>
                JPG, PNG or WebP · Maximum 5 MB
              </p>

              <div className={styles.imageNote}>
                <strong>Good to know</strong>
                <p>
                  If you don't choose another image, the current cover will
                  remain unchanged.
                </p>
              </div>
            </aside>
          </div>

          {error && (
            <div className={styles.error} role="alert">
              <span aria-hidden="true">!</span>
              {error}
            </div>
          )}

          {success && (
            <div className={styles.success} role="status">
              <span aria-hidden="true">✓</span>
              {success}
            </div>
          )}

          <div className={styles.actions}>
            <Link href="/admin/books" className={styles.cancelButton}>
              Cancel
            </Link>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Saving changes…" : "Save changes"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
