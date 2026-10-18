
import "./globals.css";
import ReduxProvider from "@/components/ReduxProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";

export const metadata = {
  title: "Chapter. | Book Store",
  description:
    "Discover your next favorite book with Chapter, your cozy corner for stories and ideas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <Toaster position="top-right" richColors />
        </ReduxProvider>
      </body>
    </html>
  );
}
