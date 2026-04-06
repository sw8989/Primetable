import { useState } from 'react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { ChevronDown, X } from 'lucide-react';
import { useRestaurants } from '@/hooks/useRestaurants';

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

const cuisines: FilterOption[] = [
  { id: 'british', label: 'British', value: 'British' },
  { id: 'french', label: 'French', value: 'French' },
  { id: 'italian', label: 'Italian', value: 'Italian' },
  { id: 'japanese', label: 'Japanese', value: 'Japanese' },
  { id: 'indian', label: 'Indian', value: 'Indian' },
  { id: 'modern-european', label: 'Modern European', value: 'Modern European' },
  { id: 'spanish', label: 'Spanish', value: 'Spanish' },
];

const locations: FilterOption[] = [
  { id: 'mayfair', label: 'Mayfair', value: 'Mayfair' },
  { id: 'shoreditch', label: 'Shoreditch', value: 'Shoreditch' },
  { id: 'soho', label: 'Soho', value: 'Soho' },
  { id: 'covent-garden', label: 'Covent Garden', value: 'Covent Garden' },
  { id: 'notting-hill', label: 'Notting Hill', value: 'Notting Hill' },
  { id: 'marylebone', label: 'Marylebone', value: 'Marylebone' },
];

const atmospheres: FilterOption[] = [
  { id: 'romantic', label: 'Romantic', value: 'romantic' },
  { id: 'casual', label: 'Casual', value: 'casual' },
  { id: 'fine-dining', label: 'Fine Dining', value: 'fine-dining' },
  { id: 'buzzy', label: 'Buzzy', value: 'buzzy' },
  { id: 'traditional', label: 'Traditional', value: 'traditional' },
];

const difficulties: FilterOption[] = [
  { id: 'easy', label: 'Easy to Book', value: 'easy' },
  { id: 'medium', label: 'Moderate', value: 'medium' },
  { id: 'hard', label: 'Hard to Book', value: 'hard' },
];

const FilterBar = () => {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [selectedPartySize, setSelectedPartySize] = useState<string | undefined>(undefined);
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<string[]>([]);
  
  const { filterRestaurants, clearFilters } = useRestaurants();
  
  const handleFilterChange = () => {
    filterRestaurants({
      cuisine: selectedCuisines,
      location: selectedLocations,
      difficulty: []
    });
  };
  
  const handleClearAll = () => {
    setSelectedCuisines([]);
    setSelectedLocations([]);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setSelectedPartySize(undefined);
    setSelectedAtmosphere([]);
    clearFilters();
  };
  
  const toggleCuisine = (value: string) => {
    setSelectedCuisines(prev => 
      prev.includes(value) 
        ? prev.filter(c => c !== value) 
        : [...prev, value]
    );
  };
  
  const toggleLocation = (value: string) => {
    setSelectedLocations(prev => 
      prev.includes(value) 
        ? prev.filter(l => l !== value) 
        : [...prev, value]
    );
  };
  
  const toggleAtmosphere = (value: string) => {
    setSelectedAtmosphere(prev => 
      prev.includes(value) 
        ? prev.filter(a => a !== value) 
        : [...prev, value]
    );
  };
  
  return (
    <section className="bg-light py-4 px-4 border-b border-gray-200">
      <div className="container mx-auto">
        <div className="flex flex-wrap gap-2">
          {/* Cuisine Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="filter-chip bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center cursor-pointer">
                <span>Cuisine</span>
                <ChevronDown className="h-5 w-5 ml-1" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <h3 className="font-semibold mb-2">Select Cuisines</h3>
              <div className="space-y-2 max-h-56 overflow-auto">
                {cuisines.map((cuisine) => (
                  <div key={cuisine.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={cuisine.id} 
                      checked={selectedCuisines.includes(cuisine.value)}
                      onCheckedChange={() => toggleCuisine(cuisine.value)}
                    />
                    <Label htmlFor={cuisine.id} className="cursor-pointer">{cuisine.label}</Label>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button 
                  className="bg-primary text-white px-3 py-1 rounded-lg text-sm"
                  onClick={handleFilterChange}
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="filter-chip bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center cursor-pointer">
                <span>Date</span>
                <ChevronDown className="h-5 w-5 ml-1" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
              <div className="mt-3 flex justify-end">
                <button 
                  className="bg-primary text-white px-3 py-1 rounded-lg text-sm"
                  onClick={handleFilterChange}
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Time Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="filter-chip bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center cursor-pointer">
                <span>Time</span>
                <ChevronDown className="h-5 w-5 ml-1" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3">
              <h3 className="font-semibold mb-2">Select Time</h3>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="lunch">Lunch (12pm - 2pm)</SelectItem>
                    <SelectItem value="dinner">Dinner (6pm - 10pm)</SelectItem>
                    <SelectItem value="6:00pm">6:00 PM</SelectItem>
                    <SelectItem value="6:30pm">6:30 PM</SelectItem>
                    <SelectItem value="7:00pm">7:00 PM</SelectItem>
                    <SelectItem value="7:30pm">7:30 PM</SelectItem>
                    <SelectItem value="8:00pm">8:00 PM</SelectItem>
                    <SelectItem value="8:30pm">8:30 PM</SelectItem>
                    <SelectItem value="9:00pm">9:00 PM</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <div className="mt-3 flex justify-end">
                <button 
                  className="bg-primary text-white px-3 py-1 rounded-lg text-sm"
                  onClick={handleFilterChange}
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Party Size Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="filter-chip bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center cursor-pointer">
                <span>Party Size</span>
                <ChevronDown className="h-5 w-5 ml-1" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3">
              <h3 className="font-semibold mb-2">Select Party Size</h3>
              <Select value={selectedPartySize} onValueChange={setSelectedPartySize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="1">1 Person</SelectItem>
                    <SelectItem value="2">2 People</SelectItem>
                    <SelectItem value="3">3 People</SelectItem>
                    <SelectItem value="4">4 People</SelectItem>
                    <SelectItem value="5">5 People</SelectItem>
                    <SelectItem value="6">6 People</SelectItem>
                    <SelectItem value="7">7 People</SelectItem>
                    <SelectItem value="8">8+ People</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <div className="mt-3 flex justify-end">
                <button 
                  className="bg-primary text-white px-3 py-1 rounded-lg text-sm"
                  onClick={handleFilterChange}
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Location Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="filter-chip bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center cursor-pointer">
                <span>Location</span>
                <ChevronDown className="h-5 w-5 ml-1" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <h3 className="font-semibold mb-2">Select Locations</h3>
              <div className="space-y-2 max-h-56 overflow-auto">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={location.id} 
                      checked={selectedLocations.includes(location.value)}
                      onCheckedChange={() => toggleLocation(location.value)}
                    />
                    <Label htmlFor={location.id} className="cursor-pointer">{location.label}</Label>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button 
                  className="bg-primary text-white px-3 py-1 rounded-lg text-sm"
                  onClick={handleFilterChange}
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Atmosphere Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="filter-chip bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center cursor-pointer">
                <span>Atmosphere</span>
                <ChevronDown className="h-5 w-5 ml-1" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <h3 className="font-semibold mb-2">Select Atmosphere</h3>
              <div className="space-y-2">
                {atmospheres.map((atmosphere) => (
                  <div key={atmosphere.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={atmosphere.id} 
                      checked={selectedAtmosphere.includes(atmosphere.value)}
                      onCheckedChange={() => toggleAtmosphere(atmosphere.value)}
                    />
                    <Label htmlFor={atmosphere.id} className="cursor-pointer">{atmosphere.label}</Label>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button 
                  className="bg-primary text-white px-3 py-1 rounded-lg text-sm"
                  onClick={handleFilterChange}
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Clear All Button */}
          <div 
            className="filter-chip bg-secondary/20 border border-secondary rounded-full px-4 py-2 flex items-center cursor-pointer text-dark"
            onClick={handleClearAll}
          >
            <span>Clear All</span>
            <X className="h-4 w-4 ml-1" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
