import Hero from "@/components/Hero";
import FullWidthDemo from "@/components/FullWidthDemo";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Benefits from "@/components/Benefits";
import Pricing from "@/components/Pricing";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <FullWidthDemo />
      <HowItWorks />
      <Features />
      <Benefits />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;