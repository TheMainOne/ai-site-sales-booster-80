import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-ai-widget.jpg";

const Hero = () => {
  const scrollToDemo = () => {
    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative bg-gradient-to-br from-cream to-background py-24 px-6 overflow-hidden">
           {/* Top-right auth button */}
      <div className="absolute right-6 top-6 z-20">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-full border-2 border-graphite text-graphite hover:bg-graphite hover:text-cream px-5"
          title="Sign in / Sign up"
        >
                          <Link
                  to="/auth"
                  className="text-cream/80 hover:text-white transition-colors"
                >
                  Sign in/Sign up
                </Link>
        </Button>
      </div>


      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-accent/5 to-transparent" />
      
      <div className="container mx-auto max-w-7xl relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Your Website, Now With an{" "}
                <span className="bg-gradient-to-r from-purple-accent to-accent bg-clip-text text-transparent">
                  AI Sales Consultant
                </span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed">
                Stop losing leads. Let visitors ask questions and get instant answers, quotes, and product picks.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-accent to-accent hover:from-purple-accent/90 hover:to-accent/90 text-white font-semibold px-8 py-6 text-lg shadow-lg transition-all duration-300 hover:shadow-xl"
                onClick={scrollToDemo}
              >
                Try Live Demo
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 border-graphite text-graphite hover:bg-graphite hover:text-cream font-semibold px-8 py-6 text-lg transition-all duration-300"
              >
                Get Started Free
              </Button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8">
              {[
                "1-line install",
                "Citations from docs", 
                "GDPR-friendly",
                "Works with CRM"
              ].map((badge) => (
                <div key={badge} className="flex items-center gap-2 p-3 bg-white/50 rounded-lg shadow-sm">
                  <div className="w-2 h-2 bg-purple-accent rounded-full" />
                  <span className="text-sm font-medium text-foreground">{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={heroImage} 
                alt="AI Widget Demo Interface"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-accent/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;