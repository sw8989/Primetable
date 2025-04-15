import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RestaurantCard from '@/components/RestaurantCard';
import { Restaurant } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

const Favorites = () => {
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // In a real app, we would fetch favorites from the API
  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      // Demo data
      setFavorites([
        {
          id: 1,
          name: "Chiltern Firehouse",
          description: "Trendy hotel restaurant by acclaimed chef Nuno Mendes. Frequented by celebrities and A-listers.",
          cuisine: "Modern European",
          location: "Marylebone",
          imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
          bookingDifficulty: "hard",
          bookingInfo: "Opens reservations 90 days in advance at midnight",
          bookingPlatform: "OpenTable",
          bookingNotes: "Some tables reserved for hotel guests",
          platformId: "chiltern123",
        },
        {
          id: 3,
          name: "Dishoom",
          description: "Popular Bombay-style café serving Indian small plates and signature cocktails in retro setting.",
          cuisine: "Indian",
          location: "Covent Garden",
          imageUrl: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
          bookingDifficulty: "medium",
          bookingInfo: "Accepts bookings up to 3 weeks in advance",
          bookingPlatform: "OpenTable",
          bookingNotes: "Walk-ins available for bar seating",
          platformId: "dishoom789",
        }
      ]);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const removeFavorite = (id: number) => {
    setFavorites(prevFavorites => prevFavorites.filter(fav => fav.id !== id));
    
    toast({
      title: "Removed from favorites",
      description: "Restaurant has been removed from your favorites",
    });
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="font-display text-3xl font-bold mb-6">My Favorite Restaurants</h1>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map(restaurant => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Heart className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No favorite restaurants yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Add restaurants to your favorites by clicking the heart icon on any restaurant card.
              </p>
              <Link href="/">
                <Button className="bg-primary hover:bg-primary-light">
                  Discover Restaurants
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Favorites;
