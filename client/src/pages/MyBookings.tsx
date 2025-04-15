import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertCircle, Clock } from 'lucide-react';
import { useBooking } from '@/hooks/useBooking';
import { Booking } from '@shared/schema';

const BookingStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-success text-white">Confirmed</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500 text-white">Pending</Badge>;
    case 'cancelled':
      return <Badge className="bg-gray-500 text-white">Cancelled</Badge>;
    case 'completed':
      return <Badge className="bg-blue-500 text-white">Completed</Badge>;
    default:
      return <Badge className="bg-gray-500 text-white">{status}</Badge>;
  }
};

const AgentStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'active':
      return <Badge variant="outline" className="bg-light text-success border-success">Agent Active</Badge>;
    case 'success':
      return <Badge variant="outline" className="bg-light text-success border-success">Booking Secured</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-light text-error border-error">Agent Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // In a real app, we would fetch bookings from the API
  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      // Demo data
      setBookings([
        {
          id: 1,
          userId: 1,
          restaurantId: 1,
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          time: "7:30 PM",
          partySize: 2,
          status: "pending",
          agentStatus: "active",
          confirmed: false,
          priorityBooking: true,
          acceptSimilarTimes: true,
          autoConfirm: true,
          createdAt: new Date(),
          agentLog: null,
          platformBookingId: null,
          restaurant: {
            id: 1,
            name: "Chiltern Firehouse",
            description: "Trendy hotel restaurant by acclaimed chef Nuno Mendes.",
            cuisine: "Modern European",
            location: "Marylebone",
            imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
            bookingDifficulty: "hard",
            bookingInfo: "Opens reservations 90 days in advance at midnight",
            bookingPlatform: "OpenTable",
            bookingNotes: "Some tables reserved for hotel guests",
            platformId: "chiltern123",
          }
        },
        {
          id: 2,
          userId: 1,
          restaurantId: 2,
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          time: "8:00 PM",
          partySize: 4,
          status: "confirmed",
          agentStatus: "success",
          confirmed: true,
          priorityBooking: true,
          acceptSimilarTimes: true,
          autoConfirm: true,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Created 7 days ago
          agentLog: null,
          platformBookingId: "res123456",
          restaurant: {
            id: 2,
            name: "The Clove Club",
            description: "2 Michelin Star restaurant serving innovative British cuisine.",
            cuisine: "British",
            location: "Shoreditch",
            imageUrl: "https://images.unsplash.com/photo-1559304822-9eb2813c9844?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
            bookingDifficulty: "hard",
            bookingInfo: "Reservations open 2 months in advance",
            bookingPlatform: "Tock",
            bookingNotes: "Required prepayment for tasting menu",
            platformId: "cloveclub456",
          }
        }
      ]);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleConfirm = (id: number) => {
    toast({
      title: "Booking Confirmed",
      description: "Your reservation has been confirmed.",
    });
    
    // Update the booking status in state
    setBookings(prevBookings => 
      prevBookings.map(booking => 
        booking.id === id 
          ? { ...booking, status: "confirmed", confirmed: true } 
          : booking
      )
    );
  };
  
  const handleCancel = (id: number) => {
    toast({
      title: "Booking Cancelled",
      description: "Your reservation has been cancelled.",
      variant: "destructive"
    });
    
    // Update the booking status in state
    setBookings(prevBookings => 
      prevBookings.map(booking => 
        booking.id === id 
          ? { ...booking, status: "cancelled", agentStatus: "failed" } 
          : booking
      )
    );
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="font-display text-3xl font-bold mb-6">My Bookings</h1>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.length > 0 ? (
            bookings.map(booking => (
              <Card key={booking.id} className="overflow-hidden">
                <div className="h-32 relative">
                  <img 
                    src={booking.restaurant?.imageUrl} 
                    alt={booking.restaurant?.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center">
                    <h3 className="text-white font-display text-xl font-semibold">
                      {booking.restaurant?.name}
                    </h3>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </div>
                
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{format(new Date(booking.date), 'EEE, MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium">{booking.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Party Size</p>
                      <p className="font-medium">{booking.partySize} {booking.partySize === 1 ? 'Person' : 'People'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Booking Ref</p>
                      <p className="font-medium">
                        {booking.platformBookingId || 'Pending'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <AgentStatusBadge status={booking.agentStatus} />
                    {booking.agentStatus === 'active' && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Hunting for tables</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="border-t pt-4 bg-gray-50">
                  {booking.status === 'pending' && (
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                        <span className="text-sm">
                          {booking.restaurant?.bookingPlatform} confirmation pending
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-error text-error hover:bg-error hover:text-white"
                          onClick={() => handleCancel(booking.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {booking.status === 'confirmed' && (
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center">
                        <Check className="h-5 w-5 text-success mr-2" />
                        <span className="text-sm">Confirmed via {booking.restaurant?.bookingPlatform}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-error text-error hover:bg-error hover:text-white"
                        onClick={() => handleCancel(booking.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  {booking.status === 'cancelled' && (
                    <div className="w-full flex items-center">
                      <X className="h-5 w-5 text-error mr-2" />
                      <span className="text-sm">Booking cancelled</span>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-2 py-12 text-center">
              <h3 className="text-xl font-semibold mb-2">No bookings found</h3>
              <p className="text-gray-500 mb-6">You haven't made any reservations yet.</p>
              <Button className="bg-primary hover:bg-primary-light">Find a Restaurant</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
