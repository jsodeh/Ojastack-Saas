import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function CapabilitiesStep() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Capabilities Selection</span>
          </CardTitle>
          <CardDescription>
            This step will be implemented in Phase 5
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Here you'll select which modalities your agent can handle:
            Text, Voice, Image, and Video capabilities with tool selection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}