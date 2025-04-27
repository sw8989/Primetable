import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { RestaurantProvider } from "./contexts/RestaurantContext";
import { BookingProvider } from "./contexts/BookingContext";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RestaurantProvider>
      <BookingProvider>
        <App />
        <Toaster />
      </BookingProvider>
    </RestaurantProvider>
  </QueryClientProvider>
);
