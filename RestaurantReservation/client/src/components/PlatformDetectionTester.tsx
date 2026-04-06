import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function PlatformDetectionTester() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleDetect = async () => {
    if (!url || !url.trim()) {
      setError('Please enter a valid restaurant URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let testUrl = url;
      
      // Add https:// if missing
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = 'https://' + testUrl;
      }

      const response = await fetch('/api/booking/detect-platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: testUrl }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'opentable':
        return <Badge variant="default" className="bg-green-600">OpenTable</Badge>;
      case 'resy':
        return <Badge variant="default" className="bg-blue-600">Resy</Badge>;
      case 'tock':
        return <Badge variant="default" className="bg-orange-600">Tock</Badge>;
      case 'sevenrooms':
        return <Badge variant="default" className="bg-purple-600">SevenRooms</Badge>;
      case 'direct':
        return <Badge variant="default" className="bg-slate-600">Direct Booking</Badge>;
      default:
        return <Badge variant="default" className="bg-red-600">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Platform Detection Tester</CardTitle>
        <CardDescription>
          Test our platform detection capabilities on restaurant websites
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter restaurant website URL (e.g., therestaurant.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={handleDetect} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  'Detect Platform'
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {result.success ? 'Platform Detected' : 'Detection Failed'}
                </AlertTitle>
                <AlertDescription>
                  {result.success
                    ? `We detected ${result.platform} with ${Math.round(result.confidence * 100)}% confidence.`
                    : result.message || 'Failed to detect the booking platform.'}
                </AlertDescription>
              </Alert>

              {result.success && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Platform:</span>
                    {getPlatformBadge(result.platform)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Confidence:</span>
                    <span className="text-sm">{Math.round(result.confidence * 100)}%</span>
                  </div>
                  {result.platformDetails && result.platformDetails.detected && (
                    <div className="space-y-2">
                      <div className="font-medium">Platform Details:</div>
                      <pre className="whitespace-pre-wrap text-sm bg-slate-100 p-2 rounded-md overflow-auto max-h-[200px]">
                        {JSON.stringify(result.platformDetails, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Supported platforms: OpenTable, Resy, Tock, SevenRooms, and direct booking systems
        </div>
      </CardFooter>
    </Card>
  );
}