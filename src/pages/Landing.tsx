import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import cindaLogo from "@/assets/cinda-logo-grey.png";

const Landing = () => {
  const navigate = useNavigate();

  const handleStartProfile = () => {
    navigate("/profile");
  };

  return (
    <div 
      className="min-h-[100dvh] overflow-y-auto" 
      style={{ 
        paddingTop: 'env(safe-area-inset-top)', 
        paddingBottom: 'env(safe-area-inset-bottom)' 
      }}
    >
      {/* Main content area */}
      <main className="flex items-center justify-center px-4 py-8 md:px-6 min-h-[100dvh]">
        <div className="w-full max-w-lg flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden relative z-10 min-h-[540px]">
          
          {/* Content - vertically centered */}
          <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 flex-1">
            <div className="space-y-4 mb-10">
              <img src={cindaLogo} alt="Cinda" className="h-[104px] mx-auto" />
              <p 
                className="text-2xl text-card-foreground/90 max-w-md leading-tight font-extrabold italic" 
                style={{ fontVariantLigatures: 'none' }}
              >
                Every runner deserves to find their perfect fit.
              </p>
              <p className="text-muted-foreground max-w-md text-sm">
                Tell me a bit about you and I'll recommend shoes that suit how you run.
              </p>
            </div>
            
            {/* CTA Button */}
            <Button
              onClick={handleStartProfile}
              variant="cta"
              className="w-full max-w-[280px] min-h-[44px] text-sm"
            >
              begin
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
