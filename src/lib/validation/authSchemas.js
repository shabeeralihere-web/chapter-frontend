
import * as yup from "yup";

export const signupSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Please enter your full name.")
    .min(2, "Name must contain at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),

  email: yup
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .required("Email address is required."),

  password: yup
    .string()
    .required("Password is required.")
    .min(8, "Password must contain at least 8 characters.")
    .max(128, "Password cannot exceed 128 characters."),

  confirmPassword: yup
    .string()
    .required("Please confirm your password.")
    .oneOf([yup.ref("password")], "Passwords do not match."),

  accountType: yup
    .string()
    .oneOf(["reader", "seller"], "Please select an account type.")
    .required("Please select an account type."),

  sellerReason: yup
    .string()
    .trim()
    .max(500, "The reason cannot exceed 500 characters.")
    .when("accountType", {
      is: "seller",
      then: (schema) => schema,
      otherwise: (schema) => schema.strip(),
    }),
});

export const loginSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .required("Email address is required."),

  password: yup
    .string()
    .required("Password is required."),
});
