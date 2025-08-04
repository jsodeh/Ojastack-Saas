import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  createRealTimeUpdater,
  hasProcessingDocuments,
  getProcessingProgress,
  type KnowledgeBaseData,
  type KnowledgeBaseRealTimeUpdater,
  type RealTimeUpdateConfig
} from '@/lib/knowledge-base-service';
import { useToast } from '@/hooks/use-toast';

// Mock data for different scenarios
const mockScenarios = {
  noData: {
    stats: { totalBases: 0, totalDocuments: 0, storageUsed: 0, processingQueue: 0 },
    knowledgeBases: [],
    recentDocuments: [],
  },
  someData: {
    stats: { totalBases: 2, totalDocuments: 5, storageUsed: 5000, processingQueue: 1 },
    knowledgeBases: [
      {
        id: 'kb-1',
        name: 'Customer Support',
        description: 'Support documentation',
        status: 'active' as const,
        documentCount: 3,
        totalSize: 3000,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        userId: 'demo-user',
      },
      {
        id: 'kb-2',
        name: 'Product Docs',
        description: 'Product documentation',
        status: 'processing' as const,
        documentCount: 2,
        totalSize: 2000,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        userId: 'demo-user',
      },
    ],
    recentDocuments: [
      {
        id: '1',
        knowledgeBaseId: 'kb-1',
        filename: 'support-guide.pdf',
        fileSize: 1500,
        status: 'processed' as const,
        chunkCount: 10,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
        knowledgeBaseName: 'Customer Support',
      },
      {
        id: '2',
        knowledgeBaseId: 'kb-2',
        filename: 'product-manual.pdf',
        fileSize: 2500,
        status: 'processing' as const,
        chunkCount: 15,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date().toISOString(),
        knowledgeBaseName: 'Product Docs',
      },
    ],
  },
  lotsOfData: {
    stats: { totalBases: 10, totalDocuments: 50, storageUsed: 50000, processingQueue: 5 },
    knowledgeBases: Array.from({ length: 10 }, (_, i) => ({
      id: `kb-${i}`,
      name: `Knowledge Base ${i + 1}`,
      description: `Description for knowledge base ${i + 1}`,
      status: (i % 3 === 0 ? 'processing' : 'active') as 'active' | 'processing',
      documentCount: Math.floor(Math.random() * 20) + 1,
      totalSize: Math.floor(Math.random() * 10000) + 1000,
      lastUpdated: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 604800000).toISOString(),
      userId: 'demo-user',
    })),
    recentDocuments: Array.from({ length: 20 }, (_, i) => ({
      id: `doc-${i}`,
      knowledgeBaseId: `kb-${i % 10}`,
      filename: `document-${i + 1}.pdf`,
      fileSize: Math.floor(Math.random() * 5000) + 500,
      status: (['processing', 'processed', 'error'][i % 3]) as 'processing' | 'processed' | 'error',
      chunkCount: Math.floor(Math.random() * 30) + 5,
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      knowledgeBaseName: `Knowledge Base ${(i % 10) + 1}`,
    })),
  },
};

export default function KnowledgeBaseRealTimeDemo() {
  const { toast } = useToast();
  const [currentScenario, setCurrentScenario] = useState<keyof typeof mockScenarios>('noData');
  const [data, setData] = useState<KnowledgeBaseData>(mockScenarios.noData);
  const [updater, setUpdater] = useState<KnowledgeBaseRealTimeUpdater | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Simulate data changes for processing scenario
  const simulateProcessingProgress = () => {
    if (currentScenario === 'someData' || currentScenario === 'lotsOfData') {
      setData(prevData => {
        const newData = { ...prevData };
        
        // Randomly complete some processing documents
        newData.recentDocuments = newData.recentDocuments.map(doc => {
          if (doc.status === 'processing' && Math.random() > 0.7) {
            return { ...doc, status: 'processed' as const };
          }
          return doc;
        });
        
        // Update stats
        const processingCount = newData.recentDocuments.filter(doc => doc.status === 'processing').length;
        newData.stats = { ...newData.stats, processingQueue: processingCount };
        
        return newData;
      });
    }
  };

  // Initialize real-time updater
  useEffect(() => {
    const config: RealTimeUpdateConfig = {
      enabled: true,
      interval: 3000, // 3 seconds for demo
      maxRetries: 3,
      onUpdate: (newData) => {
        setData(newData);
        setLastUpdateTime(new Date());
        setUpdateCount(prev => prev + 1);
        
        toast({
          title: "Data Updated",
          description: `Real-time update #${updateCount + 1} received.`,
          variant: "default",
        });
      },
      onError: (error) => {
        toast({
          title: "Update Error",
          description: error.message,
          variant: "destructive",
        });
      },
    };

    // Mock the updater with our simulation
    const mockUpdater = createRealTimeUpdater('demo-user', config);
    
    // Override the forceUpdate method to use our simulation
    const originalForceUpdate = mockUpdater.forceUpdate.bind(mockUpdater);
    mockUpdater.forceUpdate = async () => {
      simulateProcessingProgress();
      setLastUpdateTime(new Date());
      setUpdateCount(prev => prev + 1);
    };

    setUpdater(mockUpdater);

    return () => {
      mockUpdater.stop();
    };
  }, [currentScenario, updateCount]);

  // Auto-enable real-time updates when there are processing documents
  useEffect(() => {
    if (!updater) return;

    const shouldEnable = hasProcessingDocuments(data);
    
    if (shouldEnable && !isRealTimeEnabled) {
      updater.start();
      setIsRealTimeEnabled(true);
      toast({
        title: "Real-time Updates Enabled",
        description: "Automatically enabled due to processing documents.",
      });
    } else if (!shouldEnable && isRealTimeEnabled) {
      updater.stop();
      setIsRealTimeEnabled(false);
      toast({
        title: "Real-time Updates Disabled",
        description: "No processing documents detected.",
      });
    }
  }, [updater, data, isRealTimeEnabled]);

  const switchScenario = (scenario: keyof typeof mockScenarios) => {
    setCurrentScenario(scenario);
    setData(mockScenarios[scenario]);
    setUpdateCount(0);
    setLastUpdateTime(null);
  };

  const progress = getProcessingProgress(data);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Knowledge Base Real-time Demo</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}></div>
          <span className="text-sm text-muted-foreground">
            {isRealTimeEnabled ? 'Live updates active' : 'Updates paused'}
          </span>
        </div>
      </div>

      {/* Scenario Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            {Object.keys(mockScenarios).map((scenario) => (
              <Button
                key={scenario}
                variant={currentScenario === scenario ? 'default' : 'outline'}
                onClick={() => switchScenario(scenario as keyof typeof mockScenarios)}
              >
                {scenario === 'noData' ? 'No Data' :
                 scenario === 'someData' ? 'Some Data' : 'Lots of Data'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {hasProcessingDocuments(data) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <div>
                  <p className="font-medium text-yellow-800">Processing Documents</p>
                  <p className="text-sm text-yellow-600">
                    {progress.processing} processing, {progress.completed} completed, {progress.failed} failed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-800">{progress.percentage}%</div>
                <p className="text-xs text-yellow-600">Complete</p>
              </div>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Knowledge Bases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalBases}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalDocuments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data.stats.storageUsed / 1024)} KB
            </div>
          </CardContent>
        </Card>
        
        <Card className={data.stats.processingQueue > 0 ? 'border-yellow-200 bg-yellow-50/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <span>Processing Queue</span>
              {data.stats.processingQueue > 0 && (
                <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              data.stats.processingQueue > 0 ? 'text-yellow-700' : ''
            }`}>
              {data.stats.processingQueue}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Documents</CardTitle>
            <div className="flex items-center space-x-2">
              {lastUpdateTime && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdateTime.toLocaleTimeString()}
                </span>
              )}
              <Badge variant="outline">
                Updates: {updateCount}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents found
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentDocuments.slice(0, 5).map((doc, index) => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg transition-all duration-300 hover:shadow-sm animate-in fade-in slide-in-from-left-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div>
                    <p className="font-medium">{doc.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(doc.fileSize / 1024)} KB • {doc.chunkCount} chunks
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={
                      doc.status === 'processed' ? 'bg-green-50 text-green-700 border-green-200' :
                      doc.status === 'processing' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button 
              onClick={() => updater?.forceUpdate()}
              disabled={!updater}
            >
              Force Update
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                if (isRealTimeEnabled) {
                  updater?.stop();
                  setIsRealTimeEnabled(false);
                } else {
                  updater?.start();
                  setIsRealTimeEnabled(true);
                }
              }}
              disabled={!updater}
            >
              {isRealTimeEnabled ? 'Stop' : 'Start'} Real-time Updates
            </Button>
            <Button 
              variant="outline"
              onClick={simulateProcessingProgress}
            >
              Simulate Progress
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}