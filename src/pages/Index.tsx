import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, hsl(24 100% 70%) 0%, hsl(30 100% 85%) 50%, hsl(35 100% 92%) 100%)' }}>
      {/* Header with Alpha badge */}
      <header className="w-full px-6 py-4 flex justify-end">
        <span className="px-3 py-1 text-xs font-medium tracking-wider uppercase bg-card/80 text-card-foreground rounded-full border border-border/30 backdrop-blur-sm">
          Alpha
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="text-center space-y-8">
          {/* Logo */}
          <h1 className="text-6xl md:text-8xl font-semibold tracking-tight text-card">
            Cinda
          </h1>

          {/* Tagline */}
          <p className="text-lg md:text-xl text-card/70 font-light tracking-wide">
            Find your perfect fit.
          </p>

          {/* CTA Button */}
          <div className="pt-8">
            <Link to="/chat">
              <Button variant="cta" size="lg">
                Ask Cinda
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer spacer */}
      <footer className="h-16" />
    </div>
  );
};

export default Index;
