
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/lib/axios";

// Extract a useful error message from backend or Axios errors.
function getErrorMessage(error) {
  const data = error.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const firstError = data.errors[0];

    const message =
      firstError.message ||
      firstError.msg ||
      firstError.error;

    const field = firstError.field || firstError.path;

    if (message && field) {
      return `${field}: ${message}`;
    }

    if (message) {
      return message;
    }
  }

  if (typeof data?.errors === "string") {
    return data.errors;
  }

  return (
    data?.message ||
    data?.error ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

// Support different backend response structures.
function extractAuthData(data) {
  const result = data?.data ?? data;

  return {
    accessToken:
      result?.accessToken ??
      result?.token ??
      data?.accessToken ??
      data?.token ??
      null,

    user: result?.user ?? data?.user ?? null,
  };
}

// Register a new user.
export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const {
        accountType,
        sellerReason,
        ...payload
      } = userData;

      // Keep confirmPassword because the backend requires it.
      const response = await api.post("/auth/register", payload);

      return extractAuthData(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Log in an existing user.
export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/login", credentials);
      const result = extractAuthData(response.data);

      if (!result.accessToken) {
        return rejectWithValue(
          "The login response did not include an access token."
        );
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", result.accessToken);
      }

      let user = result.user;

      // Retrieve the user profile if login does not return it.
      if (!user) {
        try {
          const profileResponse = await api.get("/auth/me");

          user =
            profileResponse.data?.data?.user ??
            profileResponse.data?.user ??
            null;
        } catch {
          user = null;
        }
      }

      return {
        accessToken: result.accessToken,
        user,
      };
    } catch (error) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }

      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Restore the user's session when the application opens.
export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async (_, { rejectWithValue }) => {
    try {
      if (typeof window === "undefined") {
        return rejectWithValue("Browser storage is unavailable.");
      }

      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        return rejectWithValue("No saved session.");
      }

      const response = await api.get("/auth/me");

      const user =
        response.data?.data?.user ??
        response.data?.user ??
        null;

      if (!user) {
        throw new Error("Could not retrieve your user profile.");
      }

      return {
        accessToken,
        user,
      };
    } catch (error) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }

      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Update the logged-in user's name, bio, and/or profile photo.
//
// Pass either:
// 1. FormData containing name, bio, and optionally profileImage (a file)
// 2. A normal object containing name and/or bio
export const updateUserProfile = createAsyncThunk(
  "auth/updateUserProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        "/auth/profile",
        profileData
      );

      const updatedUser =
        response.data?.data?.user ??
        response.data?.user ??
        response.data?.data ??
        null;

      if (
        !updatedUser ||
        typeof updatedUser !== "object" ||
        !(
          updatedUser.id ||
          updatedUser._id ||
          updatedUser.email
        )
      ) {
        return rejectWithValue(
          "Profile update response did not contain valid user details."
        );
      }

      return updatedUser;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const initialState = {
  user: null,
  accessToken: null,
  loading: false,
  restoring: false,
  profileUpdating: false,
  initialized: false,
  error: null,
  profileError: null,
  profileSuccess: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    clearAuthError(state) {
      state.error = null;
    },

    clearProfileError(state) {
      state.profileError = null;
    },

    clearProfileSuccess(state) {
      state.profileSuccess = false;
    },

    // Update Redux authentication state after successful signup.
    setCredentials(state, action) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.initialized = true;
      state.loading = false;
      state.error = null;
    },

    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.loading = false;
      state.restoring = false;
      state.profileUpdating = false;
      state.initialized = true;
      state.error = null;
      state.profileError = null;
      state.profileSuccess = false;

      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }
    },
  },

  extraReducers: (builder) => {
    builder
      // Registration
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Registration failed. Please try again.";
      })

      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.error =
          action.payload || "Login failed. Please try again.";
      })

      // Session restoration
      .addCase(restoreSession.pending, (state) => {
        state.restoring = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.restoring = false;
        state.initialized = true;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.restoring = false;
        state.initialized = true;
        state.accessToken = null;
        state.user = null;
      })

      // Profile update
      .addCase(updateUserProfile.pending, (state) => {
        state.profileUpdating = true;
        state.profileError = null;
        state.profileSuccess = false;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.profileUpdating = false;

        // Keep existing user details if the response omits optional fields.
        state.user = {
          ...(state.user || {}),
          ...action.payload,
        };

        state.profileError = null;
        state.profileSuccess = true;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.profileUpdating = false;
        state.profileError =
          action.payload || "Could not update your profile.";
        state.profileSuccess = false;
      });
  },
});

export const {
  clearAuthError,
  clearProfileError,
  clearProfileSuccess,
  logout,
  setCredentials,
} = authSlice.actions;

export default authSlice.reducer;
