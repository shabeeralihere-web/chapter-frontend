"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  MapPin,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import api from "@/lib/axios";
import {
  fetchCart,
  updateCartItem,
  removeCartItem,
} from "@/store/cart/cartThunks";

import styles from "./checkout.module.css";

const emptyAddress = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

const paymentMethods = [
  {
    id: "cod",
    title: "Cash on Delivery",
    description: "Pay when your books arrive",
    symbol: "COD",
    available: true,
  },
  {
    id: "upi",
    title: "UPI",
    description: "Google Pay, PhonePe and other UPI apps",
    symbol: "UPI",
    available: false,
  },
  {
    id: "card",
    title: "Credit / Debit Card",
    description: "Visa, Mastercard and supported cards",
    symbol: "CARD",
    available: false,
  },
  {
    id: "netbanking",
    title: "Net Banking",
    description: "Pay through your bank",
    symbol: "BANK",
    available: false,
  },
];

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function getAddressPayload(address) {
  return {
    fullName: address.fullName.trim(),
    phone: address.phone.trim(),
    addressLine1: address.addressLine1.trim(),
    addressLine2: address.addressLine2.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim(),
  };
}

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { user, initialized, restoring } = useSelector(
    (state) => state.auth
  );

  const {
    items = [],
    summary,
    loading: cartLoading,
  } = useSelector((state) => state.cart);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [updatingBookId, setUpdatingBookId] = useState(null);
  const [pageError, setPageError] = useState("");

  const loadAddresses = useCallback(async () => {
    setAddressLoading(true);

    try {
      const response = await api.get("/addresses");
      const result = response.data?.data ?? response.data;
      const list = Array.isArray(result) ? result : [];

      setAddresses(list);

      setSelectedAddressId((current) => {
        if (current && list.some((address) => address._id === current)) {
          return current;
        }

        return (
          list.find((address) => address.isDefault)?._id ||
          list[0]?._id ||
          ""
        );
      });
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to load saved addresses.")
      );
    } finally {
      setAddressLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized || restoring) return;

    if (!user) {
      router.replace("/login?redirect=/checkout");
      return;
    }

    if (user.role === "admin") {
      router.replace("/");
      return;
    }

    dispatch(fetchCart());
    loadAddresses();
  }, [
    initialized,
    restoring,
    user,
    dispatch,
    router,
    loadAddresses,
  ]);

  const selectedAddress = addresses.find(
    (address) => address._id === selectedAddressId
  );

  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => {
        const price = Number(item.unitPrice ?? item.book?.price) || 0;
        const quantity = Number(item.quantity) || 0;

        return total + price * quantity;
      }, 0),
    [items]
  );

  const shippingFee = Number(summary?.shippingFee) || 0;
  const discount = Number(summary?.discount) || 0;
  const totalPrice = Math.max(0, subtotal + shippingFee - discount);

  const hasStockIssue = items.some(
    (item) =>
      !item.book ||
      Number(item.book.stock) < Number(item.quantity) ||
      Number(item.book.stock) < 1
  );

  async function handleQuantityChange(item, quantity) {
    const bookId = item.book?._id;

    if (!bookId || quantity < 1 || updatingBookId || placingOrder) {
      return;
    }

    setUpdatingBookId(bookId);

    try {
      const result = await dispatch(
        updateCartItem({ bookId, quantity })
      );

      if (updateCartItem.fulfilled.match(result)) {
        toast.success("Quantity updated.");
      } else {
        toast.error(result.payload || "Unable to update quantity.");
      }
    } finally {
      setUpdatingBookId(null);
    }
  }

  async function handleRemoveItem(bookId) {
    if (!bookId || updatingBookId || placingOrder) return;

    setUpdatingBookId(bookId);

    try {
      const result = await dispatch(removeCartItem(bookId));

      if (removeCartItem.fulfilled.match(result)) {
        toast.success("Book removed from checkout.");
      } else {
        toast.error(result.payload || "Unable to remove book.");
      }
    } finally {
      setUpdatingBookId(null);
    }
  }

  function startNewAddress() {
    setAddressForm(emptyAddress);
    setEditingAddressId(null);
    setShowAddressForm(true);
    setPageError("");
  }

  function startEditAddress(address) {
    setAddressForm({
      ...emptyAddress,
      ...address,
      addressLine2: address.addressLine2 || "",
    });

    setEditingAddressId(address._id);
    setShowAddressForm(true);
    setPageError("");
  }

  function handleAddressInput(event) {
    const { name, value } = event.target;

    setAddressForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    setPageError("");

    const payload = getAddressPayload(addressForm);

    for (const field of [
      "fullName",
      "phone",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "country",
    ]) {
      if (!payload[field]) {
        setPageError("Please complete all required address fields.");
        return;
      }
    }

    setSavingAddress(true);

    try {
      const response = editingAddressId
        ? await api.patch(`/addresses/${editingAddressId}`, payload)
        : await api.post("/addresses", {
            ...payload,
            isDefault: addresses.length === 0,
          });

      const savedAddress = response.data?.data;

      toast.success(
        editingAddressId
          ? "Address updated successfully."
          : "Address saved successfully."
      );

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(emptyAddress);

      await loadAddresses();

      if (savedAddress?._id) {
        setSelectedAddressId(savedAddress._id);
      }
    } catch (error) {
      setPageError(
        getErrorMessage(error, "Unable to save this address.")
      );
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleSetDefault(addressId) {
    try {
      await api.patch(`/addresses/${addressId}/default`);
      setSelectedAddressId(addressId);
      await loadAddresses();
      toast.success("Default address updated.");
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to update the default address.")
      );
    }
  }

  async function handleDeleteAddress(addressId) {
    if (
      !window.confirm("Are you sure you want to delete this address?")
    ) {
      return;
    }

    setDeletingAddressId(addressId);

    try {
      await api.delete(`/addresses/${addressId}`);
      toast.success("Address deleted.");
      await loadAddresses();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to delete this address.")
      );
    } finally {
      setDeletingAddressId(null);
    }
  }

  async function handlePlaceOrder() {
    if (placingOrder) return;

    if (!items.length) {
      toast.error("Your cart is empty.");
      return;
    }

    if (hasStockIssue) {
      toast.error("Please resolve the stock issues before ordering.");
      return;
    }

    if (!selectedAddress) {
      toast.error("Please select a delivery address.");
      return;
    }

    if (selectedPayment !== "cod") {
      toast.error(
        "Online payments are coming soon. Please choose Cash on Delivery."
      );
      return;
    }

    setPlacingOrder(true);

    try {
      // The backend recalculates prices and checks stock before
      // creating the order. Never trust a frontend total as final.
      const response = await api.post("/orders/checkout", {
        shippingAddress: getAddressPayload(selectedAddress),
        paymentMethod: "cod",
      });

      const order = response.data?.data;

      if (!response.data?.success || !order?._id) {
        throw new Error(
          response.data?.message || "The order could not be confirmed."
        );
      }

      toast.success("Your order has been placed!");

      // The backend clears the cart after successful checkout.
      await dispatch(fetchCart());

      router.push(
        `/order-success?orderId=${encodeURIComponent(order._id)}`
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to place your order.")
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  if (!initialized || restoring || !user) {
    return (
      <main className={styles.page}>
        <div className={styles.status}>
          <span className={styles.brandMark}>C.</span>
          <p>Preparing your checkout...</p>
        </div>
      </main>
    );
  }

  if (user.role === "admin") return null;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/cart">Your cart</Link>
          <span>/</span>
          <span aria-current="page">Checkout</span>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>ALMOST YOURS</p>
          <h1>A few details, then your next chapter.</h1>
          <p>
            Confirm your delivery details and review your books before
            placing your order.
          </p>
        </header>

        <div className={styles.progress}>
          <span className={styles.progressDone}>01&nbsp; Your cart</span>
          <span className={styles.progressActive}>02&nbsp; Checkout</span>
          <span className={styles.progressMuted}>03&nbsp; Order placed</span>
        </div>

        {cartLoading && items.length === 0 ? (
          <section className={styles.status}>
            <span className={styles.brandMark}>C.</span>
            <p>Loading your books...</p>
          </section>
        ) : items.length === 0 ? (
          <section className={styles.empty}>
            <span className={styles.brandMark}>C.</span>
            <h2>Your cart is empty.</h2>
            <p>Choose a book to begin your next reading journey.</p>
            <Link href="/books" className={styles.primaryButton}>
              Explore books <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <div className={styles.layout}>
            <div className={styles.mainColumn}>
              <section className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <span className={styles.stepNumber}>01</span>
                  <div>
                    <h2>Delivery address</h2>
                    <p>Where should we send your books?</p>
                  </div>
                  <MapPin size={21} aria-hidden="true" />
                </div>

                {addressLoading ? (
                  <p className={styles.helperText}>
                    Loading your addresses...
                  </p>
                ) : addresses.length === 0 ? (
                  <p className={styles.helperText}>
                    You have no saved addresses yet. Add one to continue.
                  </p>
                ) : (
                  <div className={styles.addressList}>
                    {addresses.map((address) => (
                      <article
                        key={address._id}
                        className={`${styles.addressCard} ${
                          selectedAddressId === address._id
                            ? styles.addressSelected
                            : ""
                        }`}
                      >
                        <label className={styles.addressSelect}>
                          <input
                            type="radio"
                            name="selectedAddress"
                            value={address._id}
                            checked={selectedAddressId === address._id}
                            onChange={() =>
                              setSelectedAddressId(address._id)
                            }
                          />
                          <span className={styles.radioVisual} />
                          <span className={styles.addressContent}>
                            <strong>{address.fullName}</strong>
                            {address.isDefault && (
                              <span className={styles.defaultBadge}>
                                Default
                              </span>
                            )}
                            <span>{address.phone}</span>
                            <span>{address.addressLine1}</span>
                            {address.addressLine2 && (
                              <span>{address.addressLine2}</span>
                            )}
                            <span>
                              {address.city}, {address.state}{" "}
                              {address.postalCode}
                            </span>
                            <span>{address.country}</span>
                          </span>
                        </label>

                        <div className={styles.addressActions}>
                          <button
                            type="button"
                            onClick={() => startEditAddress(address)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Edit
                          </button>

                          {!address.isDefault && (
                            <button
                              type="button"
                              onClick={() =>
                                handleSetDefault(address._id)
                              }
                            >
                              Make default
                            </button>
                          )}

                          <button
                            type="button"
                            className={styles.deleteText}
                            disabled={
                              deletingAddressId === address._id
                            }
                            onClick={() =>
                              handleDeleteAddress(address._id)
                            }
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            {deletingAddressId === address._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {!showAddressForm ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={startNewAddress}
                  >
                    <Plus size={17} aria-hidden="true" />
                    Add a delivery address
                  </button>
                ) : (
                  <form
                    className={styles.addressForm}
                    onSubmit={handleSaveAddress}
                  >
                    <div className={styles.formHeading}>
                      <h3>
                        {editingAddressId
                          ? "Edit address"
                          : "New delivery address"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddressId(null);
                          setAddressForm(emptyAddress);
                          setPageError("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div className={styles.formGrid}>
                      <label>
                        Full name *
                        <input
                          name="fullName"
                          value={addressForm.fullName}
                          onChange={handleAddressInput}
                          maxLength={100}
                          autoComplete="name"
                          required
                        />
                      </label>

                      <label>
                        Phone number *
                        <input
                          name="phone"
                          value={addressForm.phone}
                          onChange={handleAddressInput}
                          maxLength={25}
                          autoComplete="tel"
                          inputMode="tel"
                          required
                        />
                      </label>

                      <label className={styles.fullWidth}>
                        Address line 1 *
                        <input
                          name="addressLine1"
                          value={addressForm.addressLine1}
                          onChange={handleAddressInput}
                          maxLength={200}
                          autoComplete="address-line1"
                          required
                        />
                      </label>

                      <label className={styles.fullWidth}>
                        Address line 2
                        <input
                          name="addressLine2"
                          value={addressForm.addressLine2}
                          onChange={handleAddressInput}
                          maxLength={200}
                          autoComplete="address-line2"
                        />
                      </label>

                      <label>
                        City *
                        <input
                          name="city"
                          value={addressForm.city}
                          onChange={handleAddressInput}
                          maxLength={100}
                          autoComplete="address-level2"
                          required
                        />
                      </label>

                      <label>
                        State *
                        <input
                          name="state"
                          value={addressForm.state}
                          onChange={handleAddressInput}
                          maxLength={100}
                          autoComplete="address-level1"
                          required
                        />
                      </label>

                      <label>
                        PIN code *
                        <input
                          name="postalCode"
                          value={addressForm.postalCode}
                          onChange={handleAddressInput}
                          maxLength={20}
                          autoComplete="postal-code"
                          inputMode="numeric"
                          required
                        />
                      </label>

                      <label>
                        Country *
                        <input
                          name="country"
                          value={addressForm.country}
                          onChange={handleAddressInput}
                          maxLength={100}
                          autoComplete="country-name"
                          required
                        />
                      </label>
                    </div>

                    {pageError && (
                      <p className={styles.formError} role="alert">
                        {pageError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={savingAddress}
                    >
                      {savingAddress ? "Saving..." : "Save address"}
                      {!savingAddress && (
                        <ArrowRight size={17} aria-hidden="true" />
                      )}
                    </button>
                  </form>
                )}
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <span className={styles.stepNumber}>02</span>
                  <div>
                    <h2>Payment method</h2>
                    <p>Choose how you’d like to pay.</p>
                  </div>
                  <CreditCard size={21} aria-hidden="true" />
                </div>

                <div className={styles.paymentList}>
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`${styles.paymentCard} ${
                        selectedPayment === method.id
                          ? styles.paymentSelected
                          : ""
                      } ${
                        !method.available
                          ? styles.paymentUnavailable
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={selectedPayment === method.id}
                        onChange={() => setSelectedPayment(method.id)}
                      />
                      <span className={styles.radioVisual} />
                      <span className={styles.paymentSymbol}>
                        {method.symbol}
                      </span>
                      <span className={styles.paymentText}>
                        <strong>{method.title}</strong>
                        <span>{method.description}</span>
                      </span>
                      {!method.available && (
                        <span className={styles.comingSoon}>
                          Coming soon
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {selectedPayment === "cod" ? (
                  <p className={styles.paymentNote}>
                    You’ll pay when your order is delivered. No online
                    payment is required now.
                  </p>
                ) : (
                  <p className={styles.paymentNote}>
                    This payment option is displayed for now, but online
                    payments are not enabled yet. Choose Cash on Delivery
                    to place your order.
                  </p>
                )}
              </section>
            </div>

            <aside className={styles.summaryPanel}>
              <div className={styles.summaryHeader}>
                <p className={styles.eyebrow}>YOUR SELECTION</p>
                <h2>Order summary</h2>
                <p>Review your books before confirming.</p>
              </div>

              <div className={styles.summaryItems}>
                {items.map((item) => {
                  const book = item.book;
                  if (!book) return null;

                  const quantity = Number(item.quantity) || 1;
                  const stock = Number(book.stock) || 0;
                  const unitPrice =
                    Number(item.unitPrice ?? book.price) || 0;
                  const busy = updatingBookId === book._id;

                  return (
                    <article
                      className={styles.summaryBook}
                      key={book._id}
                    >
                      <div className={styles.miniCover}>
                        {book.coverImage ? (
                          <img src={book.coverImage} alt="" />
                        ) : (
                          <span>C.</span>
                        )}
                      </div>

                      <div className={styles.miniBookDetails}>
                        <strong>{book.title}</strong>
                        <span>{book.author || "Unknown author"}</span>

                        <div className={styles.miniControls}>
                          <button
                            type="button"
                            aria-label={`Decrease ${book.title} quantity`}
                            disabled={
                              busy || quantity <= 1 || placingOrder
                            }
                            onClick={() =>
                              handleQuantityChange(item, quantity - 1)
                            }
                          >
                            <Minus size={13} aria-hidden="true" />
                          </button>

                          <span>{quantity}</span>

                          <button
                            type="button"
                            aria-label={`Increase ${book.title} quantity`}
                            disabled={
                              busy ||
                              quantity >= Math.min(stock, 99) ||
                              placingOrder
                            }
                            onClick={() =>
                              handleQuantityChange(item, quantity + 1)
                            }
                          >
                            <Plus size={13} aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            className={styles.removeMini}
                            disabled={busy || placingOrder}
                            onClick={() => handleRemoveItem(book._id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <strong className={styles.miniPrice}>
                        {formatPrice(unitPrice * quantity)}
                      </strong>
                    </article>
                  );
                })}
              </div>

              <div className={styles.totals}>
                <div>
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div>
                  <span>Shipping</span>
                  <span className={styles.freeShipping}>
                    {shippingFee ? formatPrice(shippingFee) : "Free"}
                  </span>
                </div>

                {discount > 0 && (
                  <div>
                    <span>Discount</span>
                    <span className={styles.discount}>
                      −{formatPrice(discount)}
                    </span>
                  </div>
                )}

                <div className={styles.grandTotal}>
                  <strong>Total</strong>
                  <strong>{formatPrice(totalPrice)}</strong>
                </div>
              </div>

              {hasStockIssue && (
                <p className={styles.warning} role="alert">
                  One or more books have a stock issue. Update the
                  quantities before placing your order.
                </p>
              )}

              <button
                type="button"
                className={styles.placeOrderButton}
                onClick={handlePlaceOrder}
                disabled={
                  placingOrder ||
                  cartLoading ||
                  addressLoading ||
                  !items.length ||
                  hasStockIssue ||
                  !selectedAddress ||
                  selectedPayment !== "cod"
                }
              >
                {placingOrder ? "Placing your order..." : "Place order"}
                {!placingOrder && (
                  <ArrowRight size={17} aria-hidden="true" />
                )}
              </button>

              {selectedPayment !== "cod" && (
                <p className={styles.warning}>
                  Online payments are coming soon. Select Cash on
                  Delivery to continue.
                </p>
              )}

              <p className={styles.secureNote}>
                <ShieldCheck size={16} aria-hidden="true" />
                Your order is confirmed only after the server successfully
                creates it.
              </p>

              <Link href="/cart" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" />
                Return to cart
              </Link>

              <div className={styles.trustNote}>
                <PackageCheck size={17} aria-hidden="true" />
                <span>Every order begins a new chapter.</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}