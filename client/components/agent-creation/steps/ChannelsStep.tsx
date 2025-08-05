import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export default function ChannelsStep() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Deployment Channels</span>
          </CardTitle>
          <CardDescription>
            This step will be implemented in Phase 6
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Here you'll select where to deploy your agent:
            Website widget, WhatsApp, Email, Slack, and other channels.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}