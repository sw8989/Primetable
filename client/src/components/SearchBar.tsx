import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRestaurants } from '@/hooks/useRestaurants';

interface SearchBarProps {
  className?: string;
}

const SearchBar = ({ className = '' }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { searchRestaurants } = useRestaurants();
  
  const handleSearch = () => {
    searchRestaurants(searchTerm);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <div className={`bg-dark-light rounded-full p-2 flex items-center ${className}`}>
      <div className="bg-light/10 rounded-full p-2 mr-2">
        <Search className="h-5 w-5 text-light" />
      </div>
      <input 
        type="text" 
        placeholder="Search restaurant name or cuisine..." 
        className="bg-transparent flex-1 outline-none text-light placeholder-light/60"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button 
        className="bg-secondary text-dark px-4 py-2 rounded-full font-medium hover:bg-secondary-light transition"
        onClick={handleSearch}
      >
        Search
      </Button>
    </div>
  );
};

export default SearchBar;
