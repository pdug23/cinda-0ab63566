import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Quiz = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="w-full px-4 py-3 flex items-center relative z-10 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </header>

      {/* Main content area */}
      <main className="flex-1 flex items-center justify-center px-4 pb-8 md:px-6">
        <div className="w-full max-w-3xl flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden relative z-10">
          
          {/* Content */}
          <div className="flex flex-col items-center justify-center text-center p-8 md:p-12">
            <p className="text-xl text-card-foreground/90 mb-4">
              Quiz Step 1
            </p>
            <p className="text-muted-foreground text-sm mb-8">
              This is where the quiz questions will appear.
            </p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="border-border/30 text-card-foreground hover:bg-card-foreground/10"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Quiz;
