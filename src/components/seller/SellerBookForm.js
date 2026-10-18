
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import api from "@/lib/axios";
import styles from "@/app/admin/books/add/add-book.module.css";

const CATEGORIES = [
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

const INITIAL_FORM = {
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

function getErrorMessage(error) {
  const status = error.response?.status;

  if (status === 401) return "Please sign in again.";
  if (status === 403) {
    return error.response?.data?.message ||
      "Your seller account may not be approved yet.";
  }
  if (status === 404) return "This book could not be found.";
  if (status === 413) return "The cover image is too large.";

  return error.response?.data?.message ||
    "Something went wrong. Please try again.";
}

function getBookData(response) {
  return response?.data?.data ?? response?.data?.book ?? response?.data;
}

export default function SellerBookForm({ mode = "add", bookId }) {
  const isEdit = mode === "edit";
  const router = useRouter();
  const { user, accessToken, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [existingCover, setExistingCover] = useState("");
  const [preview, setPreview] = useState("");
  const [loadingBook, setLoadingBook] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showAdditional, setShowAdditional] = useState(false);

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
    }
  }, [initialized, restoring, accessToken, user?.role, router]);

  useEffect(() => {
    if (!isEdit || !bookId || !initialized || restoring || !accessToken ||
        user?.role !== "seller") {
      if (!isEdit) setLoadingBook(false);
      return;
    }

    let cancelled = false;

    async function loadBook() {
      setLoadingBook(true);
      setErrorMessage("");

      try {
        const response = await api.get(`/books/${bookId}`);
        const book = getBookData(response);

        if (!book?._id) {
          throw new Error("The book details could not be loaded.");
        }

        if (cancelled) return;

        setForm({
          title: book.title ?? "",
          author: book.author ?? "",
          description: book.description ?? "",
          price: String(book.price ?? ""),
          stock: String(book.stock ?? 0),
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

        const categories = Array.isArray(book.categories)
          ? book.categories
          : book.category
            ? [book.category]
            : [];

        setSelectedCategories(categories);
        setExistingCover(book.coverImage ?? "");
        setPreview(book.coverImage ?? "");

        if (
          book.isbn ||
          book.publisher ||
          book.publicationYear ||
          book.language ||
          book.edition ||
          book.format ||
          book.pages
        ) {
          setShowAdditional(true);
        }
      } catch (error) {
        if (!cancelled) {
          const message = getErrorMessage(error);
          setErrorMessage(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoadingBook(false);
      }
    }

    loadBook();

    return () => {
      cancelled = true;
    };
  }, [isEdit, bookId, initialized, restoring, accessToken, user?.role]);

  useEffect(() => {
    if (!coverFile) return;

    const objectUrl = URL.createObjectURL(coverFile);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleCategory(category) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("The cover image must be 5 MB or smaller.");
      return;
    }

    setCoverFile(file);
    setErrorMessage("");
  }

  function removeCover() {
    setCoverFile(null);
    setExistingCover("");
    setPreview("");
  }

  function validateForm() {
    if (!form.title.trim()) return "Enter the book title.";
    if (!form.author.trim()) return "Enter the author's name.";
    if (!form.description.trim()) return "Enter a book description.";
    if (selectedCategories.length === 0) {
      return "Choose at least one book category.";
    }

    const price = Number(form.price);
    if (form.price.trim() === "" || !Number.isFinite(price) || price < 0) {
      return "Enter a valid price of zero or more.";
    }

    const stock = Number(form.stock);
    if (
      form.stock.trim() === "" ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      return "Stock must be a whole number of zero or more.";
    }

    if (form.pages !== "") {
      const pages = Number(form.pages);
      if (!Number.isInteger(pages) || pages < 1) {
        return "Pages must be a whole number greater than zero.";
      }
    }

    if (form.publicationYear !== "") {
      const year = Number(form.publicationYear);
      if (!Number.isInteger(year) || year < 1000 || year > 2100) {
        return "Enter a valid publication year.";
      }
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      toast.error(validationError);
      return;
    }

    const formData = new FormData();

    formData.append("title", form.title.trim());
    formData.append("author", form.author.trim());
    formData.append("description", form.description.trim());
    formData.append("price", String(Number(form.price)));
    formData.append("stock", String(Number(form.stock)));
    formData.append("category", selectedCategories[0]);
    formData.append("categories", JSON.stringify(selectedCategories));

    [
      "pages",
      "isbn",
      "publisher",
      "publicationYear",
      "language",
      "edition",
      "format",
    ].forEach((field) => {
      if (form[field] !== "") {
        formData.append(field, form[field].trim());
      }
    });

    if (coverFile) {
      formData.append("coverImage", coverFile);
    }

    setSaving(true);

    try {
      if (isEdit) {
        await api.patch(`/books/${bookId}`, formData, {
          headers: { "Content-Type": undefined },
        });
        toast.success("Book updated successfully.");
      } else {
        await api.post("/books", formData, {
          headers: { "Content-Type": undefined },
        });
        toast.success("Book added successfully.");
      }

      router.push("/seller/books");
      router.refresh();
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (
    !initialized ||
    restoring ||
    !accessToken ||
    user?.role !== "seller" ||
    loadingBook
  ) {
    return (
      <main className={styles.page}>
        <div className={styles.loading} role="status">
          {isEdit ? "Loading book details..." : "Loading form..."}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/seller/dashboard">Seller Centre</Link>
          <span aria-hidden="true">/</span>
          <Link href="/seller/books">My Books</Link>
          <span aria-hidden="true">/</span>
          <span>{isEdit ? "Edit Book" : "Add Book"}</span>
        </nav>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>CHAPTER SELLER CENTRE</p>
            <h1>{isEdit ? "Edit your book" : "Add a new book"}</h1>
            <p>
              {isEdit
                ? "Update your book information. Your existing cover stays in place unless you replace it."
                : "Add the details readers need to discover your book."}
            </p>
          </div>

          <Link href="/seller/books" className={styles.backLink}>
            ← Back to My Books
          </Link>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.mainColumn}>
              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>01</span>
                  <div>
                    <h2>Book information</h2>
                    <p>Start with the essential details about your book.</p>
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
                      placeholder="Enter the book title"
                      maxLength={200}
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
                      placeholder="Enter the author's name"
                      maxLength={150}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="description">Description *</label>
                    <textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="What is this book about?"
                      required
                    />
                  </div>

                  <div className={styles.twoColumns}>
                    <div className={styles.field}>
                      <label htmlFor="price">Price (₹) *</label>
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
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="stock">Stock quantity *</label>
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
                    </div>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>02</span>
                  <div>
                    <h2>Categories</h2>
                    <p>Select all categories that describe your book.</p>
                  </div>
                </div>

                <div className={styles.categoryGrid}>
                  {CATEGORIES.map((category) => {
                    const selected = selectedCategories.includes(category);

                    return (
                      <button
                        key={category}
                        type="button"
                        aria-pressed={selected}
                        className={`${styles.categoryChip} ${
                          selected ? styles.categoryChipSelected : ""
                        }`}
                        onClick={() => toggleCategory(category)}
                      >
                        <span className={styles.chipCheck}>
                          {selected ? "✓" : "+"}
                        </span>
                        {category}
                      </button>
                    );
                  })}
                </div>

                <p className={styles.selectionHint}>
                  {selectedCategories.length
                    ? `${selectedCategories.length} category selected${
                        selectedCategories.length > 1 ? "s" : ""
                      }`
                    : "Choose at least one category to continue."}
                </p>
              </section>

              <section className={styles.additionalSection}>
                <button
                  type="button"
                  className={styles.additionalToggle}
                  aria-expanded={showAdditional}
                  onClick={() => setShowAdditional((value) => !value)}
                >
                  <span className={styles.additionalIcon}>＋</span>
                  <span className={styles.additionalText}>
                    <strong>Additional book details</strong>
                    <small>
                      ISBN, publisher, publication year, pages and format
                    </small>
                  </span>
                  <span className={styles.chevron}>
                    {showAdditional ? "−" : "+"}
                  </span>
                </button>

                {showAdditional && (
                  <div className={styles.additionalContent}>
                    <p className={styles.additionalIntro}>
                      These details are optional but can help readers identify
                      the correct edition.
                    </p>

                    <div className={styles.twoColumns}>
                      <div className={styles.field}>
                        <label htmlFor="isbn">ISBN</label>
                        <input
                          id="isbn"
                          name="isbn"
                          value={form.isbn}
                          onChange={handleChange}
                          placeholder="ISBN number"
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="publisher">Publisher</label>
                        <input
                          id="publisher"
                          name="publisher"
                          value={form.publisher}
                          onChange={handleChange}
                          placeholder="Publisher name"
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="publicationYear">Publication year</label>
                        <input
                          id="publicationYear"
                          name="publicationYear"
                          type="number"
                          min="1000"
                          max="2100"
                          value={form.publicationYear}
                          onChange={handleChange}
                          placeholder="e.g. 2025"
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="pages">Pages</label>
                        <input
                          id="pages"
                          name="pages"
                          type="number"
                          min="1"
                          step="1"
                          value={form.pages}
                          onChange={handleChange}
                          placeholder="Number of pages"
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="language">Language</label>
                        <input
                          id="language"
                          name="language"
                          value={form.language}
                          onChange={handleChange}
                          placeholder="English"
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="edition">Edition</label>
                        <input
                          id="edition"
                          name="edition"
                          value={form.edition}
                          onChange={handleChange}
                          placeholder="e.g. Second edition"
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="format">Format</label>
                        <select
                          id="format"
                          name="format"
                          value={form.format}
                          onChange={handleChange}
                        >
                          <option value="">Select a format</option>
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
                <span className={styles.imageStep}>03</span>
                <div>
                  <h2>Book cover</h2>
                  <p>Use a clear, high-quality image.</p>
                </div>
              </div>

              <div className={styles.imagePreview}>
                {preview ? (
                  <img src={preview} alt="Book cover preview" />
                ) : (
                  <div className={styles.emptyPreview}>
                    <span className={styles.imageIcon}>▧</span>
                    <strong>No cover selected</strong>
                    <small>
                      {isEdit
                        ? "You can keep the existing cover or choose a replacement."
                        : "Add a cover to help readers recognise your book."}
                    </small>
                  </div>
                )}
              </div>

              <input
                id="coverImage"
                className={styles.fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverChange}
              />

              <label htmlFor="coverImage" className={styles.uploadButton}>
                {coverFile ? "Choose another image" : "Upload book cover"}
              </label>

              {(coverFile || existingCover) && (
                <div className={styles.selectedFile}>
                  <span className={styles.fileName}>
                    {coverFile
                      ? coverFile.name
                      : "Current cover image"}
                  </span>
                  {coverFile && (
                    <button
                      type="button"
                      className={styles.removeImage}
                      onClick={() => {
                        setCoverFile(null);
                        setPreview(existingCover);
                      }}
                    >
                      Undo
                    </button>
                  )}
                </div>
              )}

              <p className={styles.uploadHint}>
                JPG, PNG or WebP · Maximum size 5 MB
              </p>

              <div className={styles.imageNote}>
                <strong>Cover image tip</strong>
                <p>
                  Use a front-cover image with readable text and good lighting.
                  A clear image makes your listing easier to recognise.
                </p>
              </div>
            </aside>
          </div>

          {errorMessage && (
            <div className={styles.error} role="alert">
              <span>!</span>
              {errorMessage}
            </div>
          )}

          <div className={styles.actions}>
            <Link href="/seller/books" className={styles.cancelButton}>
              Cancel
            </Link>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={saving}
            >
              {saving
                ? isEdit
                  ? "Saving changes..."
                  : "Adding book..."
                : isEdit
                  ? "Save changes"
                  : "Add book"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
