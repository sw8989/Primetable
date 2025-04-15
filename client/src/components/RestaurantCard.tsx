import { useState } from 'react';
import { MapPin, Heart, Clock, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Restaurant } from '@shared/schema';
import { useBooking } from '@/hooks/useBooking';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard = ({ restaurant }: RestaurantCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { openBookingModal } = useBooking();
  const { toast } = useToast();
  
  const toggleFavorite = () => {
    setIsFavorite(prev => !prev);
    
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite 
        ? `${restaurant.name} has been removed from your favorites` 
        : `${restaurant.name} has been added to your favorites`,
    });
  };
  
  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success';
      case 'medium': return 'bg-[#FFC107]'; // Yellow
      case 'hard': return 'bg-error';
      default: return 'bg-gray-400';
    }
  };
  
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Easy to book';
      case 'medium': return 'Moderately difficult to book';
      case 'hard': return 'Very hard to book';
      default: return 'Unknown difficulty';
    }
  };
  
  const getAvailabilityText = (difficulty: string) => {
    // This would be replaced with actual availability data from API
    switch (difficulty) {
      case 'easy': return { text: 'Next available: Tomorrow at 7:30pm', isAvailable: true };
      case 'medium': return { text: 'Next available: Next week on Tuesday', isAvailable: true };
      case 'hard': return { text: 'Fully booked next 3 weeks', isAvailable: false };
      default: return { text: 'Check availability', isAvailable: false };
    }
  };
  
  const availability = getAvailabilityText(restaurant.bookingDifficulty);
  
  const handleBook = () => {
    openBookingModal(restaurant);
  };
  
  return (
    <div className="restaurant-card bg-white rounded-lg overflow-hidden shadow-md transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        <img 
          src={restaurant.imageUrl} 
          alt={`Interior of ${restaurant.name}`} 
          className="w-full h-48 object-cover"
        />
        <button 
          className="absolute top-3 right-3 bg-white/80 p-2 rounded-full hover:bg-white transition"
          onClick={toggleFavorite}
        >
          <Heart 
            className={`h-5 w-5 ${isFavorite ? 'text-primary fill-primary' : 'text-gray-400'}`} 
          />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center mb-1">
            <span className={`h-3 w-3 rounded-full ${getDifficultyClass(restaurant.bookingDifficulty)} mr-2`}></span>
            <span className="text-xs text-white">{getDifficultyText(restaurant.bookingDifficulty)}</span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-display text-xl font-semibold">{restaurant.name}</h3>
            <div className="text-sm text-gray-600 flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{restaurant.location}</span>
            </div>
          </div>
          <div className="rounded-lg px-2 py-1 bg-secondary/20 text-xs font-medium">
            <span>{restaurant.cuisine}</span>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-500">
          <p>{restaurant.description}</p>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-sm">
            <p className="text-primary font-medium">Booking Info:</p>
            <ul className="mt-1 space-y-1 text-gray-600">
              <li className="flex items-start">
                <Clock className="h-4 w-4 mr-1 mt-0.5 text-gray-400" />
                <span>{restaurant.bookingInfo}</span>
              </li>
              <li className="flex items-start">
                <Info className="h-4 w-4 mr-1 mt-0.5 text-gray-400" />
                <span>Uses {restaurant.bookingPlatform} for online booking</span>
              </li>
              {restaurant.bookingNotes && (
                <li className="flex items-start">
                  <Users className="h-4 w-4 mr-1 mt-0.5 text-gray-400" />
                  <span>{restaurant.bookingNotes}</span>
                </li>
              )}
            </ul>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className={`text-sm font-medium ${availability.isAvailable ? 'text-success' : 'text-error'}`}>
              <span>{availability.text}</span>
            </div>
            <Button 
              className="bg-primary hover:bg-primary-light text-white font-medium px-4 py-2 rounded-lg transition"
              onClick={handleBook}
            >
              Book
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
