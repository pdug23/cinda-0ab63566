import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import ProfileBuilder from "./pages/ProfileBuilder";
import ProfileBuilderStep2 from "./pages/ProfileBuilderStep2";
import ProfileBuilderStep3 from "./pages/ProfileBuilderStep3";
import ProfileBuilderStep3b from "./pages/ProfileBuilderStep3b";
import ProfileBuilderStep4 from "./pages/ProfileBuilderStep4";
import ProfileBuilderStep4a from "./pages/ProfileBuilderStep4a";
import ProfileBuilderStep4Analysis from "./pages/ProfileBuilderStep4Analysis";
import ProfileBuilderStep4b from "./pages/ProfileBuilderStep4b";
import Recommendations from "./pages/Recommendations";
import QuickMatch from "./pages/QuickMatch";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ProfileProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<ProfileBuilder />} />
            <Route path="/profile/step2" element={<ProfileBuilderStep2 />} />
            <Route path="/profile/step3" element={<ProfileBuilderStep3 />} />
            <Route path="/profile/step3b" element={<ProfileBuilderStep3b />} />
            <Route path="/profile/step4" element={<ProfileBuilderStep4 />} />
            <Route path="/profile/step4a" element={<ProfileBuilderStep4a />} />
            <Route path="/profile/step4-analysis" element={<ProfileBuilderStep4Analysis />} />
            <Route path="/profile/step4b" element={<ProfileBuilderStep4b />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/quick-match" element={<QuickMatch />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </ProfileProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
