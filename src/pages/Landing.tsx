import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import cindaLogo from "@/assets/cinda-logo-grey.png";

const Landing = () => {
  const navigate = useNavigate();

  const handleStartQuiz = () => {
    navigate("/quiz");
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Main content area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:px-6">
        <div className="w-full max-w-3xl flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden relative z-10">
          
          {/* Content */}
          <div className="flex flex-col items-center justify-center text-center p-8 md:p-12">
            <div className="space-y-4 mb-10">
              <img src={cindaLogo} alt="Cinda" className="h-[104px] mx-auto" />
              <p 
                className="text-2xl text-card-foreground/90 max-w-md leading-tight font-extrabold italic" 
                style={{ fontVariantLigatures: 'none' }}
              >
                every runner deserves to find their perfect fit.
              </p>
              <p className="text-muted-foreground max-w-md text-sm">
                tell me a bit about you and i'll recommend shoes that suit how you run.
              </p>
            </div>
            
            {/* CTA Button */}
            <Button
              onClick={handleStartQuiz}
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
