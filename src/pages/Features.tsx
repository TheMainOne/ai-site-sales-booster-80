import Features from "@/components/Features";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="py-6 px-6 border-b">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Назад на главную
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Возможности</h1>
        </div>
      </header>
      <Features />
      <Footer />
    </div>
  );
};

export default FeaturesPage;