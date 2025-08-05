import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket } from 'lucide-react';

interface DeploymentStepProps {
  onComplete?: (agentId: string) => void;
}

export default function DeploymentStep({ onComplete }: DeploymentStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Rocket className="h-5 w-5" />
            <span>Agent Deployment</span>
          </CardTitle>
          <CardDescription>
            This step will be implemented in Phase 7
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Here you'll deploy your agent and get configuration details
            for your selected channels including embed codes and setup instructions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}