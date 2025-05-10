import AutomatedBookingTester from "@/components/AutomatedBookingTester";

export default function AutomationTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Booking Automation Test</h1>
      <p className="text-muted-foreground mb-6">
        Test our automated booking system capabilities on different restaurant platforms.
      </p>
      
      <div className="grid gap-8">
        <AutomatedBookingTester />
      </div>
    </div>
  );
}