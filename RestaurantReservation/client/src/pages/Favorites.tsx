import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RestaurantCard from '@/components/RestaurantCard';
import type { Favorite, Restaurant } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { getFavoritesByUser, removeFavorite } from '@/lib/api';

type FavoriteWithRestaurant = Favorite & { restaurant: Restaurant | null };

// Demo user id until auth is implemented
const DEMO_USER_ID = 1;

const Favorites = () => {
  const [favorites, setFavorites] = useState<FavoriteWithRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    getFavoritesByUser(DEMO_USER_ID)
      .then((data) => setFavorites(data))
      .catch((err) => {
        console.error('Error loading favorites:', err);
        toast({ title: 'Failed to load favorites', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (favoriteId: number) => {
    try {
      await removeFavorite(favoriteId);
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      toast({ title: 'Removed from favorites', description: 'Restaurant has been removed from your favorites.' });
    } catch {
      toast({ title: 'Failed to remove favorite', variant: 'destructive' });
    }
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
              {favorites.map((fav) =>
                fav.restaurant ? (
                  <RestaurantCard
                    key={fav.id}
                    restaurant={fav.restaurant}
                    initialFavorite
                    onRemoveFavorite={() => handleRemove(fav.id)}
                  />
                ) : null
              )}
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
