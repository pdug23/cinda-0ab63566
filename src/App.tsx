import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProfileProvider } from "@/contexts/ProfileContext";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import ProfileBuilder from "./pages/ProfileBuilder";
import ProfileBuilderStep2 from "./pages/ProfileBuilderStep2";
import ProfileBuilderStep3 from "./pages/ProfileBuilderStep3";
import ProfileBuilderStep4 from "./pages/ProfileBuilderStep4";
import ProfileBuilderStep4a from "./pages/ProfileBuilderStep4a";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
            <Route path="/profile/step4" element={<ProfileBuilderStep4 />} />
            <Route path="/profile/step4a" element={<ProfileBuilderStep4a />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
