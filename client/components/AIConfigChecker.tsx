import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Zap,
} from "lucide-react";
import { chatHelpers, chatWorkflowService } from "@/lib/chat-workflow";
import { n8nHelpers } from "@/lib/n8n-integration";

export function AIConfigChecker() {
  const [config, setConfig] = useState({
    elevenlabsConfigured: false,
    n8nConfigured: false,
    workflowStatus: { exists: false, active: false },
    netlifyFunctionAvailable: false,
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    setChecking(true);

    try {
      // Check ElevenLabs configuration
      const elevenlabsConfigured = !!import.meta.env.VITE_ELEVENLABS_API_KEY;

      // Check n8n configuration
      const n8nConfigured = n8nHelpers.validateConfig();

      // Check workflow status
      const workflowStatus = await chatWorkflowService.getWorkflowStatus();

      // Check if Netlify function is available
      let netlifyFunctionAvailable = false;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        const response = await fetch("/.netlify/functions/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "test" }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        netlifyFunctionAvailable = response.status !== 404;
      } catch (error) {
        // Handle both network errors and timeouts gracefully
        netlifyFunctionAvailable = false;
      }

      setConfig({
        elevenlabsConfigured,
        n8nConfigured,
        workflowStatus,
        netlifyFunctionAvailable,
      });
    } catch (error) {
      console.error("Error checking configuration:", error);
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getOverallStatus = () => {
    if (config.netlifyFunctionAvailable) {
      return { status: "good", message: "AI Chat is fully operational" };
    } else if (config.n8nConfigured && config.workflowStatus.active) {
      return {
        status: "warning",
        message: "n8n workflow active, but edge function unavailable",
      };
    } else {
      return { status: "error", message: "AI Chat configuration incomplete" };
    }
  };

  const overall = getOverallStatus();

  if (checking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">
              Checking AI configuration...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>AI Chat Configuration</span>
            </CardTitle>
            <CardDescription>
              System status for AI-powered conversations
            </CardDescription>
          </div>
          <Badge
            variant={
              overall.status === "good"
                ? "default"
                : overall.status === "warning"
                  ? "secondary"
                  : "destructive"
            }
            className="flex items-center space-x-1"
          >
            {overall.status === "good" ? (
              <CheckCircle className="h-3 w-3" />
            ) : overall.status === "warning" ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            <span>{overall.message}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            {overall.status === "good"
              ? "All systems operational! Your AI chat is using real AI responses."
              : overall.status === "warning"
                ? "Partial functionality available. Using n8n workflow with fallback responses."
                : "Using fallback responses. Configure the settings below for full AI capabilities."}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium">Core Services</h4>

            <div className="flex items-center justify-between">
              <span className="text-sm">Netlify Edge Function</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(config.netlifyFunctionAvailable)}
                <Badge
                  variant={
                    config.netlifyFunctionAvailable ? "default" : "destructive"
                  }
                >
                  {config.netlifyFunctionAvailable ? "Active" : "Unavailable"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">ElevenLabs API</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(config.elevenlabsConfigured)}
                <Badge
                  variant={
                    config.elevenlabsConfigured ? "default" : "secondary"
                  }
                >
                  {config.elevenlabsConfigured ? "Configured" : "Not Set"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Workflow Automation</h4>

            <div className="flex items-center justify-between">
              <span className="text-sm">n8n Integration</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(config.n8nConfigured)}
                <Badge variant={config.n8nConfigured ? "default" : "secondary"}>
                  {config.n8nConfigured ? "Connected" : "Optional"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Chat Workflow</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(
                  config.workflowStatus.exists && config.workflowStatus.active,
                )}
                <Badge
                  variant={
                    config.workflowStatus.exists && config.workflowStatus.active
                      ? "default"
                      : config.workflowStatus.exists
                        ? "secondary"
                        : "outline"
                  }
                >
                  {config.workflowStatus.exists && config.workflowStatus.active
                    ? "Active"
                    : config.workflowStatus.exists
                      ? "Inactive"
                      : "Not Created"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Setup Instructions</p>
              <p className="text-xs text-muted-foreground">
                {!config.netlifyFunctionAvailable
                  ? "Deploy the Netlify function and configure environment variables"
                  : "Configuration complete! Your AI chat is fully functional."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={checkConfiguration}>
              Refresh Status
            </Button>
          </div>
        </div>

        {!config.netlifyFunctionAvailable && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Required:</strong> Configure OPENAI_API_KEY,
              SUPABASE_SERVICE_ROLE_KEY, and ELEVENLABS_API_KEY in your
              environment variables, then deploy to enable real AI responses.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
