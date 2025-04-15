import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AgentDrawer from "@/components/AgentDrawer";

import Home from "@/pages/Home";
import MyBookings from "@/pages/MyBookings";
import Favorites from "@/pages/Favorites";
import NotFound from "@/pages/not-found";

import { useBooking } from "./hooks/useBooking";

function Router() {
  const { activeAgent } = useBooking();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/bookings" component={MyBookings} />
        <Route path="/favorites" component={Favorites} />
        <Route component={NotFound} />
      </Switch>
      <Footer />
      {activeAgent && <AgentDrawer />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
