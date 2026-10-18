
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/axios";

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function extractCart(responseData) {
  // Your backend returns { success: true, data: cart }.
  return responseData?.data ?? responseData;
}

// Fetch the current user's cart.
export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/cart");
      return extractCart(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Add a book to the cart.
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async ({ bookId, quantity = 1 }, { rejectWithValue }) => {
    try {
      const response = await api.post("/cart/items", {
        bookId,
        quantity,
      });

      return extractCart(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Update the quantity of a book already in the cart.
export const updateCartItem = createAsyncThunk(
  "cart/updateCartItem",
  async ({ bookId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/cart/items/${bookId}`,
        { quantity }
      );

      return extractCart(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Remove one book from the cart.
export const removeCartItem = createAsyncThunk(
  "cart/removeCartItem",
  async (bookId, { rejectWithValue }) => {
    try {
      const response = await api.delete(
        `/cart/items/${bookId}`
      );

      return extractCart(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Clear the entire cart.

export const clearCartOnServer = createAsyncThunk(
  "cart/clearCartOnServer",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete("/cart");
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Unable to clear your cart."
      );
    }
  }
);
