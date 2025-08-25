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
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import DashboardOverview from "./pages/dashboard/Overview";
import InteractiveDemo from "./pages/dashboard/InteractiveDemo";
import AgentsPage from "./pages/dashboard/Agents";
import CreateAgentPage from "./pages/dashboard/CreateAgent";
import AgentDetail from "./pages/dashboard/AgentDetail";
import TestAgent from "./pages/dashboard/TestAgent";
import ConversationsPage from "./pages/dashboard/Conversations";
import KnowledgeBasePage from "./pages/dashboard/KnowledgeBase";
import APIReference from "./pages/dashboard/APIReference";
import IntegrationConfig from "./pages/dashboard/IntegrationConfig";
import ProfileSettings from "./pages/dashboard/ProfileSettings";
import WidgetContainer from "./components/WidgetContainer";
import ErrorBoundary from "./components/ErrorBoundary";

import VideoTest from "./pages/dashboard/VideoTest";
// import MultimodalTest from "./pages/dashboard/MultimodalTest";
import WorkflowTest from "./pages/dashboard/WorkflowTest";
import AgentCreationWizard from "./components/agent-creation/AgentCreationWizard";
import KnowledgeBaseManager from "./components/knowledge-base/KnowledgeBaseManager";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import Analytics from "./pages/dashboard/Analytics";
import IntegrationsPage from "./pages/dashboard/Integrations";
import Onboarding from "./pages/Onboarding";

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
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

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

            {/* Onboarding Route */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            
            {/* Protected dashboard routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardOverview />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/demo"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <InteractiveDemo />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/agents"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AgentsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/agents/:agentId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AgentDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/agents/:agentId/test"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <TestAgent />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/knowledge"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <KnowledgeBasePage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/api"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <APIReference />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/analytics"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Analytics />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/integrations"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <IntegrationsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/conversations"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ConversationsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/integrations"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <IntegrationConfig />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/team"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PlaceholderPage
                      title="Team"
                      description="Manage team members"
                    />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PlaceholderPage
                      title="Settings"
                      description="Account and app settings"
                    />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProfileSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/video-test"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <VideoTest />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/multimodal-test"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <div>Multimodal Test - Temporarily Disabled</div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/workflow-test"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <WorkflowTest />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/agents/create"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CreateAgentPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/agents/create/:templateId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CreateAgentPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/knowledge-bases"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <KnowledgeBaseManager />
                  </DashboardLayout>
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
