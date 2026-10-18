
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/lib/axios";

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  );
}

// Fetch the logged-in user's wishlist
export const fetchWishlist = createAsyncThunk(
  "wishlist/fetchWishlist",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/wishlist");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Add a book to the wishlist
export const addToWishlist = createAsyncThunk(
  "wishlist/addToWishlist",
  async (bookId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/wishlist/${bookId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Remove a book from the wishlist
export const removeFromWishlist = createAsyncThunk(
  "wishlist/removeFromWishlist",
  async (bookId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/wishlist/${bookId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Clear the wishlist
export const clearWishlist = createAsyncThunk(
  "wishlist/clearWishlist",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete("/wishlist");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const initialState = {
  books: [],
  totalBooks: 0,
  loading: false,
  error: null,
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    clearWishlistError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch wishlist
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.books = action.payload.books;
        state.totalBooks = action.payload.totalBooks;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Add book
      .addCase(addToWishlist.pending, (state) => {
        state.error = null;
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.books = action.payload.books;
        state.totalBooks = action.payload.totalBooks;
      })
      .addCase(addToWishlist.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Remove book
      .addCase(removeFromWishlist.pending, (state) => {
        state.error = null;
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.books = action.payload.books;
        state.totalBooks = action.payload.totalBooks;
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Clear wishlist
      .addCase(clearWishlist.pending, (state) => {
        state.error = null;
      })
      .addCase(clearWishlist.fulfilled, (state, action) => {
        state.books = action.payload.books;
        state.totalBooks = action.payload.totalBooks;
      })
      .addCase(clearWishlist.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearWishlistError } = wishlistSlice.actions;
export default wishlistSlice.reducer;
