import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Header = () => {
  const [location] = useLocation();
  const [isLoggedIn] = useState(true); // For demo purposes, assume logged in
  
  return (
    <header className="bg-dark text-light py-4 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <div className="mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <Link href="/" className="no-underline">
            <h1 className="font-display text-2xl font-bold cursor-pointer">Prime Table</h1>
          </Link>
        </div>
        
        <nav className="hidden md:flex space-x-6 items-center">
          <Link href="/" className={`hover:text-secondary transition duration-200 ${location === '/' ? 'text-secondary' : ''}`}>
            Discover
          </Link>
          <Link href="/bookings" className={`hover:text-secondary transition duration-200 ${location === '/bookings' ? 'text-secondary' : ''}`}>
            My Bookings
          </Link>
          <Link href="/favorites" className={`hover:text-secondary transition duration-200 ${location === '/favorites' ? 'text-secondary' : ''}`}>
            Favorites
          </Link>
          <Link href="/automation-test" className={`hover:text-secondary transition duration-200 ${location === '/automation-test' ? 'text-secondary' : ''}`}>
            Auto Booking
          </Link>
          <a href="#" className="hover:text-secondary transition duration-200">Help</a>
          
          {isLoggedIn ? (
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center cursor-pointer">
              <span className="text-light font-semibold">JD</span>
            </div>
          ) : (
            <button className="bg-secondary text-dark px-4 py-2 rounded-full font-medium hover:bg-secondary-light transition">
              Login
            </button>
          )}
        </nav>
        
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <button className="text-light">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent className="bg-dark text-light">
            <div className="flex flex-col space-y-4 mt-8">
              <Link href="/" className={`hover:text-secondary transition py-2 ${location === '/' ? 'text-secondary' : ''}`}>
                Discover
              </Link>
              <Link href="/bookings" className={`hover:text-secondary transition py-2 ${location === '/bookings' ? 'text-secondary' : ''}`}>
                My Bookings
              </Link>
              <Link href="/favorites" className={`hover:text-secondary transition py-2 ${location === '/favorites' ? 'text-secondary' : ''}`}>
                Favorites
              </Link>
              <Link href="/automation-test" className={`hover:text-secondary transition py-2 ${location === '/automation-test' ? 'text-secondary' : ''}`}>
                Auto Booking
              </Link>
              <a href="#" className="hover:text-secondary transition py-2">Help</a>
              
              {!isLoggedIn && (
                <button className="bg-secondary text-dark px-4 py-2 rounded-full font-medium hover:bg-secondary-light transition w-full mt-4">
                  Login
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
