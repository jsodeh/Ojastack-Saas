import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Circle, 
  ChevronUp, 
  ChevronDown, 
  X,
  Rocket,
  ArrowRight,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import { cn } from '@/lib/utils';

export default function OnboardingTaskbar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const {
    tasks,
    completedTasks,
    pendingTasks,
    highPriorityTasks,
    completionPercentage,
    loading,
    hasIncompleteTasks,
    nextTask,
  } = useOnboardingTasks();

  // Don't show if loading, dismissed, or no incomplete tasks
  if (loading || isDismissed || !hasIncompleteTasks) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={cn(
        "transition-all duration-300 ease-in-out shadow-lg border-2",
        isExpanded ? "w-96 max-h-[calc(100vh-3rem)]" : "w-80"
      )}>
        {/* Header - Always visible */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  Setup Progress
                </CardTitle>
                <CardDescription className="text-xs">
                  {completedTasks.length} of {tasks.length} completed
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs">
                {completionPercentage}%
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronUp className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDismissed(true)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-1">
            <Progress value={completionPercentage} className="h-2" />
            {nextTask && !isExpanded && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Next: {nextTask.title}</span>
                {nextTask.action?.href && (
                  <Link to={nextTask.action.href}>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      {nextTask.action.label}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {/* Expanded content */}
        {isExpanded && (
          <CardContent className="pt-0 overflow-y-auto max-h-[calc(100vh-12rem)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="space-y-2">
              {/* High priority tasks first */}
              {highPriorityTasks.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
                    <Rocket className="h-3 w-3 mr-1" />
                    Priority Tasks
                  </h4>
                                    <div className="space-y-1">
                    {highPriorityTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start space-x-2 p-1.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <Circle className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium truncate">
                              {task.title}
                            </p>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs ml-1", getPriorityColor(task.priority))}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {task.description}
                          </p>
                          {task.action && (
                            <div className="mt-1">
                              {task.action.href ? (
                                <Link to={task.action.href}>
                                  <Button variant="outline" size="sm" className="h-6 text-xs">
                                    {task.action.label}
                                  </Button>
                                </Link>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-6 text-xs"
                                  onClick={task.action.onClick}
                                >
                                  {task.action.label}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {highPriorityTasks.length > 2 && (
                      <div className="text-center py-1">
                        <span className="text-xs text-muted-foreground">
                          +{highPriorityTasks.length - 2} more priority tasks
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other pending tasks */}
              {pendingTasks.filter(task => task.priority !== 'high').length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">
                    Other Tasks
                  </h4>
                  <div className="space-y-1">
                    {pendingTasks
                      .filter(task => task.priority !== 'high')
                      .slice(0, 3)
                      .map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start space-x-2 p-1.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <Circle className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium truncate">
                                {task.title}
                              </p>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs ml-1", getPriorityColor(task.priority))}
                              >
                                {task.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {task.description}
                            </p>
                            {task.action && (
                              <div className="mt-1">
                                {task.action.href ? (
                                  <Link to={task.action.href}>
                                    <Button variant="outline" size="sm" className="h-6 text-xs">
                                      {task.action.label}
                                    </Button>
                                  </Link>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-6 text-xs"
                                    onClick={task.action.onClick}
                                  >
                                    {task.action.label}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    {pendingTasks.filter(task => task.priority !== 'high').length > 3 && (
                      <div className="text-center py-1">
                        <span className="text-xs text-muted-foreground">
                          +{pendingTasks.filter(task => task.priority !== 'high').length - 3} more tasks
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Completed tasks summary */}
              {completedTasks.length > 0 && (
                <div className="pt-1 border-t">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>{completedTasks.length} tasks completed</span>
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="pt-1 border-t">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDismissed(true)}
                    className="text-xs text-muted-foreground"
                  >
                    Dismiss for now
                  </Button>
                  <Link to="/dashboard/settings/profile">
                    <Button variant="outline" size="sm" className="text-xs">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}