import { Button } from "@/components/ui/button";

const FinalCTA = () => {
  return (
    <section className="py-24 px-6 bg-gradient-to-r from-purple-accent to-accent">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="space-y-8">
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
            Ready to add an AI Sales Consultant to your site?
          </h2>
          
          <p className="text-xl lg:text-2xl text-white/90 leading-relaxed">
            Join hundreds of businesses already converting more visitors into customers
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Button 
              size="lg" 
              className="bg-white text-purple-accent hover:bg-white/90 font-semibold px-12 py-6 text-xl shadow-lg transition-all duration-300 hover:shadow-xl"
            >
              Get Started Free
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 border-white text-white hover:bg-white hover:text-purple-accent font-semibold px-12 py-6 text-xl transition-all duration-300"
            >
              Book a Demo
            </Button>
          </div>

          <div className="pt-8 flex flex-wrap justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span>5-minute setup</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span>GDPR compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💸</span>
              <span>30-day free trial</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;