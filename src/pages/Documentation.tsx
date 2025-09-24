import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Book, Code, Zap, Shield, Users, Rocket } from "lucide-react";

export default function Documentation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Book className="w-4 h-4 mr-2" />
            Documentation
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Developer Documentation
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive guide to integrate and customize our AI-powered website optimization solution
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Quick Start Guide</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Code className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>1. Installation</CardTitle>
                <CardDescription>
                  Add our widget to your website with a single line of code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <code className="text-sm">
                    &lt;script src="https://ai-widget.com/embed.js"&gt;&lt;/script&gt;
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>2. Configuration</CardTitle>
                <CardDescription>
                  Customize settings to match your brand and goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <code className="text-sm">
                    AIWidget.init(&#123;<br />
                    &nbsp;&nbsp;apiKey: 'your-api-key',<br />
                    &nbsp;&nbsp;theme: 'light'<br />
                    &#125;);
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Rocket className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>3. Go Live</CardTitle>
                <CardDescription>
                  Start optimizing your website and tracking results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <code className="text-sm">
                    AIWidget.start();<br />
                    // Your site is now optimized!
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="my-16" />

        {/* API Reference */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">API Reference</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Authentication
                </CardTitle>
                <CardDescription>
                  Secure your integration with API keys and tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">API Key Authentication</h4>
                  <div className="bg-muted rounded-lg p-3">
                    <code className="text-sm">
                      Authorization: Bearer your-api-key
                    </code>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Rate Limits</h4>
                  <p className="text-sm text-muted-foreground">
                    1000 requests per hour for standard plans
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Tracking
                </CardTitle>
                <CardDescription>
                  Track user behavior and conversion events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Track Events</h4>
                  <div className="bg-muted rounded-lg p-3">
                    <code className="text-sm">
                      AIWidget.track('conversion', &#123;<br />
                      &nbsp;&nbsp;value: 99.99,<br />
                      &nbsp;&nbsp;currency: 'USD'<br />
                      &#125;);
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="my-16" />

        {/* Advanced Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Advanced Features</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Hooks & Events</CardTitle>
                <CardDescription>
                  Listen to widget events and customize behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <code className="text-sm">
                    AIWidget.on('optimizationComplete', function(data) &#123;<br />
                    &nbsp;&nbsp;console.log('Optimization applied:', data.changes);<br />
                    &nbsp;&nbsp;// Custom logic here<br />
                    &#125;);<br /><br />
                    
                    AIWidget.on('conversionDetected', function(event) &#123;<br />
                    &nbsp;&nbsp;// Send to your analytics<br />
                    &nbsp;&nbsp;gtag('event', 'purchase', &#123;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;transaction_id: event.transactionId<br />
                    &nbsp;&nbsp;&#125;);<br />
                    &#125;);
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>A/B Testing Integration</CardTitle>
                <CardDescription>
                  Seamlessly integrate with your existing A/B testing tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <code className="text-sm">
                    // Configure A/B test variants<br />
                    AIWidget.configure(&#123;<br />
                    &nbsp;&nbsp;abTesting: &#123;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;enabled: true,<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;provider: 'optimizely', // or 'google-optimize'<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;experimentId: 'exp-123'<br />
                    &nbsp;&nbsp;&#125;<br />
                    &#125;);
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Support */}
        <section className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Our developer support team is here to help you succeed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Join our developer community or contact our technical support team for assistance with integration and customization.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="outline">24/7 Support</Badge>
                <Badge variant="outline">Developer Community</Badge>
                <Badge variant="outline">Code Examples</Badge>
                <Badge variant="outline">Video Tutorials</Badge>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}