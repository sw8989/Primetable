import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { RestaurantProvider } from "./contexts/RestaurantContext";
import { BookingProvider } from "./contexts/BookingContext";

createRoot(document.getElementById("root")!).render(
  <RestaurantProvider>
    <BookingProvider>
      <App />
      <Toaster />
    </BookingProvider>
  </RestaurantProvider>
);
