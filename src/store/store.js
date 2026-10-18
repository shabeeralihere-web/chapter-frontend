import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/authSlice";
import booksReducer from "./books/booksSlice";
import cartReducer from "./cart/cartSlice";
import wishlistReducer from "./wishlist/wishlistSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    books: booksReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
  },
});
