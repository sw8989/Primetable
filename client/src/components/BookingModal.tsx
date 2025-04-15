import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format, addDays } from 'date-fns';
import { X } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Restaurant } from '@shared/schema';
import { useBooking } from '@/hooks/useBooking';

// Form schema based on shared schema
const formSchema = z.object({
  date: z.date(),
  time: z.string(),
  partySize: z.number().min(1).max(20),
  waitlistOption: z.enum(['join', 'alternativeDates', 'similarRestaurants']).default('join'),
  priorityBooking: z.boolean().default(true),
  acceptSimilarTimes: z.boolean().default(true),
  autoConfirm: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface BookingModalProps {
  open: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
}

const BookingModal = ({ open, restaurant, onClose }: BookingModalProps) => {
  const [isFullyBooked] = useState(true); // For demo purposes
  const { deployBookingAgent } = useBooking();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: addDays(new Date(), 1),
      time: "7:00 PM",
      partySize: 2,
      waitlistOption: 'join',
      priorityBooking: true,
      acceptSimilarTimes: true,
      autoConfirm: true,
    }
  });
  
  const onSubmit = (data: FormValues) => {
    if (!restaurant) return;
    
    deployBookingAgent({
      restaurantId: restaurant.id,
      date: data.date,
      time: data.time,
      partySize: data.partySize,
      priorityBooking: data.priorityBooking,
      acceptSimilarTimes: data.acceptSimilarTimes,
      autoConfirm: data.autoConfirm,
      waitlistOption: data.waitlistOption,
      userId: 1, // Demo user ID
      status: "pending",
      agentStatus: "active",
      agentLog: []
    });
    
    onClose();
  };

  const partySizes = Array.from({ length: 8 }, (_, i) => i + 1);
  
  const timeOptions = [
    "5:00 PM", "5:15 PM", "5:30 PM", "5:45 PM",
    "6:00 PM", "6:15 PM", "6:30 PM", "6:45 PM", 
    "7:00 PM", "7:15 PM", "7:30 PM", "7:45 PM",
    "8:00 PM", "8:15 PM", "8:30 PM", "8:45 PM",
    "9:00 PM", "9:15 PM", "9:30 PM"
  ];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="font-display text-2xl font-semibold">
              Book Table at {restaurant?.name}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Selection */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
              
              {/* Time Selection */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Party Size */}
            <FormField
              control={form.control}
              name="partySize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Party Size</FormLabel>
                  <div className="flex space-x-2">
                    {partySizes.map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant={field.value === size ? "default" : "outline"}
                        className={`w-10 h-10 rounded-full p-0 ${
                          field.value === size ? "bg-secondary border-secondary" : ""
                        }`}
                        onClick={() => field.onChange(size)}
                      >
                        {size}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant={field.value > 8 ? "default" : "outline"}
                      className={`w-10 h-10 rounded-full p-0 ${
                        field.value > 8 ? "bg-secondary border-secondary" : ""
                      }`}
                      onClick={() => {
                        // Show a custom input for larger party sizes
                        const size = window.prompt("Enter party size (9-20):", "9");
                        const parsedSize = size ? parseInt(size, 10) : 0;
                        if (parsedSize >= 9 && parsedSize <= 20) {
                          field.onChange(parsedSize);
                        }
                      }}
                    >
                      8+
                    </Button>
                  </div>
                </FormItem>
              )}
            />
            
            {/* Fully Booked Alert with Options */}
            {isFullyBooked && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-sm text-red-600 font-medium">
                  This restaurant is currently fully booked for the selected date. Would you like to:
                </p>
                <FormField
                  control={form.control}
                  name="waitlistOption"
                  render={({ field }) => (
                    <FormItem className="mt-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="space-y-3"
                        >
                          <div className="flex items-start">
                            <RadioGroupItem value="join" id="option1" className="mt-1" />
                            <Label htmlFor="option1" className="ml-2 text-sm text-gray-700">
                              Join waitlist for cancellations (Our agent will notify you immediately when a table becomes available)
                            </Label>
                          </div>
                          <div className="flex items-start">
                            <RadioGroupItem value="alternativeDates" id="option2" className="mt-1" />
                            <Label htmlFor="option2" className="ml-2 text-sm text-gray-700">
                              Try alternative dates (Our agent will check the next 7 days for availability)
                            </Label>
                          </div>
                          <div className="flex items-start">
                            <RadioGroupItem value="similarRestaurants" id="option3" className="mt-1" />
                            <Label htmlFor="option3" className="ml-2 text-sm text-gray-700">
                              Try similar restaurants (We'll suggest alternatives with availability)
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Booking Agent Options */}
            <div className="p-4 bg-light border border-gray-200 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                </svg>
                Booking Agent Options
              </h4>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="priorityBooking"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="priority"
                        />
                      </FormControl>
                      <Label htmlFor="priority" className="text-sm">
                        Use Priority Booking (attempts to book as soon as slots open)
                      </Label>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="acceptSimilarTimes"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="similar_times"
                        />
                      </FormControl>
                      <Label htmlFor="similar_times" className="text-sm">
                        Accept similar times (±30 minutes from preferred time)
                      </Label>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="autoConfirm"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="auto_confirm"
                        />
                      </FormControl>
                      <Label htmlFor="auto_confirm" className="text-sm">
                        Send automatic confirmation 48 hours before reservation
                      </Label>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-primary text-white hover:bg-primary-light transition"
              >
                Deploy Booking Agent
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
