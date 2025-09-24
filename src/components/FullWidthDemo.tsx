const FullWidthDemo = () => {
  return (
    <section id="demo-section" className="w-full bg-gradient-to-b from-background to-cream py-16">
      <div className="container mx-auto max-w-7xl px-6 mb-12">
        <div className="text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
            Play With the Widget
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            Ask about pricing, bundles, FAQs — the AI answers from your docs and can generate quotes.
          </p>
        </div>
      </div>

      {/* Widget container */}
      <div className="container mx-auto max-w-4xl px-6">
        <div className="container mx-auto max-w-none px-0">
          {/* Widget placeholder with proper styling */}
          <div className="relative">
            <div 
              id="aiw-root" 
              className="w-full min-h-[600px] bg-gradient-to-br from-white to-cream/50 border border-border/30 rounded-none lg:rounded-2xl lg:mx-6 shadow-lg"
            >
              {/* Mock AI Widget Interface */}
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-accent rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">AI</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">AI-Consultant Widget</h3>
                      <p className="text-xs text-muted-foreground">Online now</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Live Demo</span>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                  {/* AI Welcome Message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-purple-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">AI</span>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm max-w-md">
                      <p className="text-foreground">
                        Hi! I'm your AI sales consultant. I can help you with pricing, product bundles, demos, and answer any questions about our services. What would you like to know?
                      </p>
                    </div>
                  </div>

                  {/* Starter Prompts */}
                  <div className="flex flex-wrap gap-2 ml-11">
                    {["Price for 10 users", "Product bundle", "Book a demo"].map((prompt) => (
                      <button 
                        key={prompt}
                        className="px-4 py-2 bg-purple-accent/10 hover:bg-purple-accent/20 text-purple-accent rounded-full text-sm font-medium transition-colors duration-200"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Sample conversation */}
                  <div className="flex gap-3 justify-end">
                    <div className="bg-purple-accent rounded-lg p-4 shadow-sm max-w-md">
                      <p className="text-white">Price for 10 users</p>
                    </div>
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 text-xs font-bold">U</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-purple-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">AI</span>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm max-w-lg">
                      <p className="text-foreground mb-3">
                        For 10 users, here are our pricing options:
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-cream rounded">
                          <span>Growth Plan (10 users)</span>
                          <span className="font-semibold">$299/month</span>
                        </div>
                        <div className="flex justify-between p-2 bg-cream rounded">
                          <span>Annual discount</span>
                          <span className="text-green-600 font-semibold">-20%</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Includes: Unlimited chats, CRM integration, analytics dashboard
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-border/20">
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Ask about pricing, features, or schedule a demo..."
                      className="flex-1 px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-accent/20 focus:border-purple-accent"
                      disabled
                    />
                    <button className="px-6 py-3 bg-purple-accent hover:bg-purple-accent/90 text-white rounded-lg font-medium transition-colors duration-200">
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Script placeholders for demo */}
            <div className="hidden">
              <div id="aiw-script-placeholder">
                {/* This would be the actual widget script in production */}
                <script defer src="/aiw.js"></script>
                <script>
                  {`
                  window.AIW.init({
                    apiBase:"/api",
                    brand:{name:"AI-Consultant Widget", color:"#7A68FF"},
                    starterPrompts:["Price for 10 users","Product bundle","Book a demo"],
                    layout:"fullwidth"
                  });
                  `}
                </script>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note under widget */}
      <div className="container mx-auto max-w-7xl px-6 mt-8">
        <p className="text-center text-muted-foreground">
          This is a live demo. Want it on your site?{" "}
          <span className="font-semibold text-purple-accent">Install in 1 line.</span>
        </p>
      </div>
    </section>
  );
};

export default FullWidthDemo;