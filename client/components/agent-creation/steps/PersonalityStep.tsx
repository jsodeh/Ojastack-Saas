import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function PersonalityStep() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Personality Configuration</span>
          </CardTitle>
          <CardDescription>
            This step will be implemented in Phase 4
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Here you'll configure your agent's personality with tone selection,
            creativity levels, and system prompt generation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}