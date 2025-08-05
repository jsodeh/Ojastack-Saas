import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TestTube } from 'lucide-react';

export default function TestingStep() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>Agent Testing</span>
          </CardTitle>
          <CardDescription>
            This step will be implemented in Phase 7
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Here you'll test your agent with multi-modal inputs
            and validate its responses before deployment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}