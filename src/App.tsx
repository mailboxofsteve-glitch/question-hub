import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import SearchResults from "./pages/SearchResults";
import NodeDetail from "./pages/NodeDetail";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NodePreview from "./pages/NodePreview";
import SpineMap from "./pages/SpineMap";
import Diagnostic from "./pages/Diagnostic";
import Analytics from "./pages/Analytics";
import Feedback from "./pages/Feedback";
import RouteAnnouncer from "./components/RouteAnnouncer";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <RouteAnnouncer />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/node/:id" element={<NodeDetail />} />
          <Route path="/node/:id/preview" element={<NodePreview />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/graph" element={<SpineMap />} />
          <Route path="/diagnostic" element={<Diagnostic />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/feedback" element={<Feedback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
