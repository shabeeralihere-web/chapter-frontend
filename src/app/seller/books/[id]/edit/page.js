
"use client";

import { useParams } from "next/navigation";
import SellerBookForm from "@/components/seller/SellerBookForm";

export default function SellerEditBookPage() {
  const params = useParams();
  const bookId = params.id;

  return <SellerBookForm mode="edit" bookId={bookId} />;
}
