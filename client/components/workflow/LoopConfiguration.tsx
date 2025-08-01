/**
 * Loop Configuration Component
 * Visual interface for configuring loop node settings
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  Settings, 
  AlertTriangle,
  Info,
  Clock,
  Hash
} from 'lucide-react';
import { LoopNodeConfig, LoopType } from '../../lib/workflow-nodes/loop-node';

interface LoopConfigurationProps {
  config: LoopNodeConfig;
  onConfigChange: (config: LoopNodeConfig) => void;
  availableFields: string[];
  className?: string;
}

export const LoopConfiguration: React.FC<LoopConfigurationProps> = ({
  config,
  onConfigChange,
  availableFields,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'limits'>('basic');

  const updateConfig = (updates: Partial<LoopNodeConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const renderBasicConfiguration = () => (
    <div className="space-y-4">
      {/* Loop Type Selection */}
      <div>
        <Label className="text-sm font-medium">Loop Type</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {(['for_each', 'while', 'for_range', 'until'] as LoopType[]).map(type => (
            <Button
              key={type}
              variant={config.type === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateConfig({ type })}
              className="justify-start"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {type.replace('_', ' ').toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Type-specific Configuration */}
      {config.type === 'for_each' && (
        <div>
          <Label htmlFor="iterableField">Iterable Field</Label>
          <select
            id="iterableField"
            value={config.iterableField || ''}
            onChange={(e) => updateConfig({ iterableField: e.target.value })}
            className="w-full mt-1 px-3 py-2 border rounded-md"
          >
            <option value="">Select field to iterate over...</option>
            {availableFields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Field must contain an array or object to iterate over
          </p>
        </div>
      )}

      {config.type === 'while' && (
        <div>
          <Label htmlFor="whileCondition">While Condition</Label>
          <Textarea
            id="whileCondition"
            value={config.whileCondition || ''}
            onChange={(e) => updateConfig({ whileCondition: e.target.value })}
            placeholder="Enter JavaScript condition (e.g., data.counter < 10)"
            className="mt-1"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            JavaScript expression that returns true/false
          </p>
        </div>
      )}

      {config.type === 'for_range' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="rangeStart">Start</Label>
            <Input
              id="rangeStart"
              type="number"
              value={config.rangeStart || 0}
              onChange={(e) => updateConfig({ rangeStart: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rangeEnd">End</Label>
            <Input
              id="rangeEnd"
              type="number"
              value={config.rangeEnd || 10}
              onChange={(e) => updateConfig({ rangeEnd: parseInt(e.target.value) || 10 })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rangeStep">Step</Label>
            <Input
              id="rangeStep"
              type="number"
              value={config.rangeStep || 1}
              onChange={(e) => updateConfig({ rangeStep: parseInt(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {config.type === 'until' && (
        <div>
          <Label htmlFor="untilCondition">Until Condition</Label>
          <Textarea
            id="untilCondition"
            value={config.untilCondition || ''}
            onChange={(e) => updateConfig({ untilCondition: e.target.value })}
            placeholder="Enter JavaScript condition (e.g., data.status === 'complete')"
            className="mt-1"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            Loop continues until this condition becomes true
          </p>
        </div>
      )}

      {/* Current Item Variable */}
      <div>
        <Label htmlFor="currentItemVariable">Current Item Variable</Label>
        <Input
          id="currentItemVariable"
          value={config.currentItemVariable}
          onChange={(e) => updateConfig({ currentItemVariable: e.target.value })}
          placeholder="item"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Variable name for the current iteration item
        </p>
      </div>

      {/* Index Variable */}
      <div>
        <Label htmlFor="indexVariable">Index Variable</Label>
        <Input
          id="indexVariable"
          value={config.indexVariable}
          onChange={(e) => updateConfig({ indexVariable: e.target.value })}
          placeholder="index"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Variable name for the current iteration index
        </p>
      </div>
    </div>
  );

  const renderAdvancedConfiguration = () => (
    <div className="space-y-4">
      {/* Parallel Execution */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Parallel Execution</Label>
          <p className="text-xs text-gray-500">Execute iterations concurrently</p>
        </div>
        <Button
          variant={config.parallel ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateConfig({ parallel: !config.parallel })}
        >
          {config.parallel ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {config.parallel && (
        <div>
          <Label htmlFor="maxConcurrency">Max Concurrent Iterations</Label>
          <Input
            id="maxConcurrency"
            type="number"
            value={config.maxConcurrency || 5}
            onChange={(e) => updateConfig({ maxConcurrency: parseInt(e.target.value) || 5 })}
            min={1}
            max={50}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum number of iterations to run simultaneously
          </p>
        </div>
      )}

      {/* Batch Processing */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Batch Processing</Label>
          <p className="text-xs text-gray-500">Process items in batches</p>
        </div>
        <Button
          variant={config.batchSize && config.batchSize > 1 ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateConfig({ 
            batchSize: config.batchSize && config.batchSize > 1 ? 1 : 10 
          })}
        >
          {config.batchSize && config.batchSize > 1 ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {config.batchSize && config.batchSize > 1 && (
        <div>
          <Label htmlFor="batchSize">Batch Size</Label>
          <Input
            id="batchSize"
            type="number"
            value={config.batchSize}
            onChange={(e) => updateConfig({ batchSize: parseInt(e.target.value) || 10 })}
            min={2}
            max={1000}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of items to process in each batch
          </p>
        </div>
      )}

      {/* Delay Between Iterations */}
      <div>
        <Label htmlFor="delayBetweenIterations">Delay Between Iterations (ms)</Label>
        <Input
          id="delayBetweenIterations"
          type="number"
          value={config.delayBetweenIterations || 0}
          onChange={(e) => updateConfig({ delayBetweenIterations: parseInt(e.target.value) || 0 })}
          min={0}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Pause between iterations to control execution speed
        </p>
      </div>

      {/* Continue on Error */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Continue on Error</Label>
          <p className="text-xs text-gray-500">Keep processing if an iteration fails</p>
        </div>
        <Button
          variant={config.continueOnError ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateConfig({ continueOnError: !config.continueOnError })}
        >
          {config.continueOnError ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {/* Collect Results */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Collect Results</Label>
          <p className="text-xs text-gray-500">Gather outputs from all iterations</p>
        </div>
        <Button
          variant={config.collectResults ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateConfig({ collectResults: !config.collectResults })}
        >
          {config.collectResults ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
    </div>
  );

  const renderLimitsConfiguration = () => (
    <div className="space-y-4">
      {/* Max Iterations */}
      <div>
        <Label htmlFor="maxIterations">Maximum Iterations</Label>
        <Input
          id="maxIterations"
          type="number"
          value={config.maxIterations || 1000}
          onChange={(e) => updateConfig({ maxIterations: parseInt(e.target.value) || 1000 })}
          min={1}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Safety limit to prevent infinite loops
        </p>
      </div>

      {/* Timeout */}
      <div>
        <Label htmlFor="timeout">Timeout (seconds)</Label>
        <Input
          id="timeout"
          type="number"
          value={config.timeout ? config.timeout / 1000 : 300}
          onChange={(e) => updateConfig({ timeout: (parseInt(e.target.value) || 300) * 1000 })}
          min={1}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum time allowed for the entire loop
        </p>
      </div>

      {/* Memory Limit Warning */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Memory Usage Warning</h4>
              <p className="text-xs text-yellow-700 mt-1">
                Large loops with result collection can consume significant memory. 
                Consider using batch processing or disabling result collection for large datasets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Performance Tips</h4>
              <ul className="text-xs text-blue-700 mt-1 space-y-1">
                <li>• Use parallel execution for I/O-bound operations</li>
                <li>• Add delays for rate-limited APIs</li>
                <li>• Enable batch processing for large datasets</li>
                <li>• Set appropriate timeout values</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Loop Configuration</h3>
          <p className="text-sm text-gray-500">
            Configure loop behavior and execution settings
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Hash className="h-3 w-3 mr-1" />
            {config.type.replace('_', ' ').toUpperCase()}
          </Badge>
          {config.parallel && (
            <Badge variant="secondary" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              Parallel
            </Badge>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'basic', label: 'Basic', icon: Settings },
          { id: 'advanced', label: 'Advanced', icon: Play },
          { id: 'limits', label: 'Limits', icon: Clock }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="flex-1"
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="pt-6">
          {activeTab === 'basic' && renderBasicConfiguration()}
          {activeTab === 'advanced' && renderAdvancedConfiguration()}
          {activeTab === 'limits' && renderLimitsConfiguration()}
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 font-medium">{config.type.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div>
              <span className="text-gray-500">Max Iterations:</span>
              <span className="ml-2 font-medium">{config.maxIterations || 1000}</span>
            </div>
            <div>
              <span className="text-gray-500">Parallel:</span>
              <span className="ml-2 font-medium">{config.parallel ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-500">Collect Results:</span>
              <span className="ml-2 font-medium">{config.collectResults ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoopConfiguration;