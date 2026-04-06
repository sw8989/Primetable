import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="bg-dark text-light py-8 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-display text-xl font-bold mb-4">Prime Table</h3>
            <p className="text-light/70 text-sm">AI-powered booking agent service for London's most exclusive restaurants.</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-light/70">
              <li><a href="#" className="hover:text-secondary">Help Center</a></li>
              <li><a href="#" className="hover:text-secondary">Contact Us</a></li>
              <li><a href="#" className="hover:text-secondary">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-secondary">Terms of Service</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Explore</h4>
            <ul className="space-y-2 text-light/70">
              <li><a href="#" className="hover:text-secondary">Restaurants</a></li>
              <li><a href="#" className="hover:text-secondary">Cuisines</a></li>
              <li><a href="#" className="hover:text-secondary">Neighborhoods</a></li>
              <li><a href="#" className="hover:text-secondary">Special Occasions</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-light/70 text-sm mb-3">Subscribe for early access to new restaurant releases and booking tips.</p>
            <div className="flex">
              <Input 
                type="email" 
                placeholder="Your email" 
                className="bg-dark-light text-light px-3 py-2 rounded-l-lg flex-1 outline-none border border-gray-700 focus:border-secondary"
              />
              <Button className="bg-secondary text-dark px-4 py-2 rounded-r-lg font-medium hover:bg-secondary-light transition">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-light/50 text-sm">
          <p>&copy; {new Date().getFullYear()} Prime Table. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
