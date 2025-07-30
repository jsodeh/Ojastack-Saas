import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Docs from "./pages/Docs";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ConfirmEmail from "./pages/ConfirmEmail";
import Demo from "./pages/Demo";
import Integrations from "./pages/Integrations";
import API from "./pages/API";
import HelpCenter from "./pages/HelpCenter";
import DashboardOverview from "./pages/dashboard/Overview";
import InteractiveDemo from "./pages/dashboard/InteractiveDemo";
import AgentsPage from "./pages/dashboard/Agents";
import AgentDetail from "./pages/dashboard/AgentDetail";
import TestAgent from "./pages/dashboard/TestAgent";
import ConversationsPage from "./pages/dashboard/Conversations";
import KnowledgeBasePage from "./pages/dashboard/KnowledgeBase";
import APIReference from "./pages/dashboard/APIReference";
import IntegrationConfig from "./pages/dashboard/IntegrationConfig";
import ProfileSettings from "./pages/dashboard/ProfileSettings";
import WidgetContainer from "./components/WidgetContainer";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirect to dashboard if logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <WidgetContainer />
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/api" element={<API />} />
            <Route path="/help" element={<HelpCenter />} />

            {/* Auth routes (redirect to dashboard if logged in) */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              }
            />
            <Route
              path="/confirm"
              element={<ConfirmEmail />}
            />

            {/* Protected dashboard routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/demo"
              element={
                <ProtectedRoute>
                  <InteractiveDemo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/agents"
              element={
                <ProtectedRoute>
                  <AgentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/agents/:agentId"
              element={
                <ProtectedRoute>
                  <AgentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/agents/:agentId/test"
              element={
                <ProtectedRoute>
                  <TestAgent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/knowledge"
              element={
                <ProtectedRoute>
                  <KnowledgeBasePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/api"
              element={
                <ProtectedRoute>
                  <APIReference />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/conversations"
              element={
                <ProtectedRoute>
                  <ConversationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/integrations"
              element={
                <ProtectedRoute>
                  <IntegrationConfig />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/team"
              element={
                <ProtectedRoute>
                  <PlaceholderPage
                    title="Team"
                    description="Manage team members"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <PlaceholderPage
                    title="Settings"
                    description="Account and app settings"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings/profile"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />

            {/* Other pages */}
            <Route
              path="/about"
              element={
                <PlaceholderPage
                  title="About Us"
                  description="Learn more about the team behind Ojastack"
                />
              }
            />
            <Route
              path="/blog"
              element={
                <PlaceholderPage
                  title="Blog"
                  description="Stay updated with the latest news and insights"
                />
              }
            />
            <Route
              path="/careers"
              element={
                <PlaceholderPage
                  title="Careers"
                  description="Join our team and help shape the future of AI"
                />
              }
            />
            <Route
              path="/status"
              element={
                <PlaceholderPage
                  title="System Status"
                  description="Check the current status of Ojastack services"
                />
              }
            />
            <Route
              path="/privacy"
              element={
                <PlaceholderPage
                  title="Privacy Policy"
                  description="Learn how we protect your data and privacy"
                />
              }
            />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

// Simple root creation
const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<App />);
