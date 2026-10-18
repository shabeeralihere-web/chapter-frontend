export function getDashboardPath(user) {
  if (user?.role === "admin") {
    return "/admin/dashboard";
  }

  if (
    user?.role === "seller" &&
    user?.sellerApplicationStatus === "approved"
  ) {
    return "/seller/dashboard";
  }

  return "/books";
}