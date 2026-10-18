
import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCartOnServer,
} from "./cartThunks";

const initialState = {
  items: [],
  summary: {
    totalItems: 0,
    subtotal: 0,
    shippingFee: 0,
    discount: 0,
    totalPrice: 0,
  },
  totalItems: 0,
  totalPrice: 0,
  loading: false,
  error: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,

  reducers: {
    clearCartError(state) {
      state.error = null;
    },

    resetCart(state) {
      state.items = [];
      state.summary = { ...initialState.summary };
      state.totalItems = 0;
      state.totalPrice = 0;
      state.loading = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch cart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        const cart = action.payload || {};

        state.items = cart.items || [];
        state.summary = {
          ...initialState.summary,
          ...(cart.summary || {}),
        };
        state.totalItems =
          cart.totalItems ??
          state.summary.totalItems ??
          0;
        state.totalPrice =
          cart.totalPrice ??
          state.summary.totalPrice ??
          0;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unable to load cart.";
      })

      // Add book
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        const cart = action.payload || {};
        state.items = cart.items || [];
        state.summary = {
          ...initialState.summary,
          ...(cart.summary || {}),
        };
        state.totalItems = cart.totalItems ?? 0;
        state.totalPrice = cart.totalPrice ?? 0;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unable to add book.";
      })

      // Update quantity
      .addCase(updateCartItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        const cart = action.payload || {};
        state.items = cart.items || [];
        state.summary = {
          ...initialState.summary,
          ...(cart.summary || {}),
        };
        state.totalItems = cart.totalItems ?? 0;
        state.totalPrice = cart.totalPrice ?? 0;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unable to update quantity.";
      })

      // Remove book
      .addCase(removeCartItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        const cart = action.payload || {};
        state.items = cart.items || [];
        state.summary = {
          ...initialState.summary,
          ...(cart.summary || {}),
        };
        state.totalItems = cart.totalItems ?? 0;
        state.totalPrice = cart.totalPrice ?? 0;
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unable to remove book.";
      })

      // Clear cart
      .addCase(clearCartOnServer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearCartOnServer.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        const cart = action.payload || {};
        state.items = cart.items || [];
        state.summary = {
          ...initialState.summary,
          ...(cart.summary || {}),
        };
        state.totalItems = cart.totalItems ?? 0;
        state.totalPrice = cart.totalPrice ?? 0;
      })
      .addCase(clearCartOnServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unable to clear cart.";
      });
  },
});

export const { clearCartError, resetCart } = cartSlice.actions;

export default cartSlice.reducer;
