
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/lib/axios";

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Unable to load books. Please try again."
  );
}

function extractBooks(data) {
  const result = data?.data ?? data;

  const items = Array.isArray(result)
    ? result
    : result?.books ??
      result?.items ??
      result?.products ??
      [];

  return {
    items,
    total:
      result?.total ??
      result?.totalBooks ??
      items.length,
    page: result?.page ?? 1,
    totalPages:
      result?.totalPages ??
      result?.pages ??
      1,
  };
}

export const fetchBooks = createAsyncThunk(
  "books/fetchBooks",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/books", { params });
      return extractBooks(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const booksSlice = createSlice({
  name: "books",

  initialState: {
    items: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    totalPages: 1,
  },

  reducers: {
    clearBooksError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchBooks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBooks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchBooks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearBooksError } = booksSlice.actions;
export default booksSlice.reducer;
