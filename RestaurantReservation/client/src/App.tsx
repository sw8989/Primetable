import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AgentDrawer from "@/components/AgentDrawer";

import Home from "@/pages/Home";
import MyBookings from "@/pages/MyBookings";
import Favorites from "@/pages/Favorites";
import NotFound from "@/pages/not-found";

// Import testing components (in dev mode only)
import AutomationTest from "@/pages/AutomationTest";

// Control visibility based on environment
const isDevEnvironment = import.meta.env.DEV;

import { useBooking } from "./hooks/useBooking";

// Debug function to test API directly
async function testRestaurantAPI() {
  try {
    console.log('Direct API test: Fetching restaurants...');
    const apiUrl = window.location.origin + '/api/restaurants';
    console.log('Testing API URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    console.log('Direct test - Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`API test failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Direct test - Restaurant count:', Array.isArray(data) ? data.length : 'Not an array');
    console.log('Direct test - First few restaurants:', Array.isArray(data) ? data.slice(0, 3) : data);
    
    return data;
  } catch (error) {
    console.error('Direct API test error:', error);
    return null;
  }
}

function Router() {
  const { activeAgent } = useBooking();
  
  // Run the API test when the app loads
  useEffect(() => {
    console.log('App mounted, testing direct API access...');
    testRestaurantAPI();
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/bookings" component={MyBookings} />
        <Route path="/favorites" component={Favorites} />
        {isDevEnvironment && <Route path="/dev-tools" component={AutomationTest} />}
        <Route component={NotFound} />
      </Switch>
      <Footer />
      {activeAgent && <AgentDrawer />}
    </div>
  );
}

function App() {
  return <Router />;
}

export default App;
