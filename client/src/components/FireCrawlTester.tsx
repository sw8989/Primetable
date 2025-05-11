import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function FireCrawlTester() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('Chiltern Firehouse London restaurant booking');
  const [results, setResults] = useState<any>(null);

  const handleSearch = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      // Call the FireCrawl endpoint
      const response = await fetch('/api/firecrawl/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(data);
        toast({
          title: data.success ? "Search Successful" : "Search Failed",
          description: data.success 
            ? `Found ${data.results?.length || 0} results.` 
            : `Search failed: ${data.error}`,
          variant: data.success ? "default" : "destructive"
        });
      } else {
        toast({
          title: "Search Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to communicate with the server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async (url: string) => {
    setLoading(true);
    
    try {
      // Call the FireCrawl scrape endpoint
      const response = await fetch('/api/firecrawl/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Content Scraped Successfully",
          description: "Content retrieved from the URL",
          variant: "default"
        });
        
        // Show the content in a new section
        setResults({
          ...results,
          scrapedContent: data.results[0].content,
          scrapedUrl: url
        });
      } else {
        toast({
          title: "Scraping Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to communicate with the server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>FireCrawl Web Search</CardTitle>
        <CardDescription>
          Test the FireCrawl web search capability for finding restaurant information.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Enter search query..." 
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={loading || !query.trim()}
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
          
          {results && results.results && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">Search Results</h3>
              
              <div className="space-y-4">
                {results.results.map((result: any, index: number) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-md">
                        <a href={result.link} target="_blank" rel="noreferrer" className="hover:underline text-blue-600">
                          {result.title}
                        </a>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm text-muted-foreground">{result.snippet}</p>
                      <div className="text-xs text-muted-foreground mt-2 truncate">{result.link}</div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleScrape(result.link)}
                        disabled={loading}
                      >
                        Scrape Content
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {results && results.scrapedContent && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">Scraped Content from {results.scrapedUrl}</h3>
              <Textarea 
                value={results.scrapedContent} 
                readOnly 
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}