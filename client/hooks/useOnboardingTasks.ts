import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  priority: 'high' | 'medium' | 'low';
}

export function useOnboardingTasks() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentCount, setAgentCount] = useState(0);

  useEffect(() => {
    if (!user || profileLoading) {
      setLoading(true);
      return;
    }

    const fetchAgentCount = async () => {
      try {
        const { count } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        setAgentCount(count || 0);
      } catch (error) {
        console.error('Error fetching agent count:', error);
        setAgentCount(0);
      }
    };

    const generateTasks = async () => {
      await fetchAgentCount();
      
      const newTasks: OnboardingTask[] = [];

      // Profile completion tasks
      if (!profile?.full_name) {
        newTasks.push({
          id: 'complete-name',
          title: 'Complete your name',
          description: 'Add your full name to personalize your experience',
          completed: false,
          action: {
            label: 'Add name',
            href: '/dashboard/settings/profile'
          },
          priority: 'high'
        });
      }

      if (!profile?.company) {
        newTasks.push({
          id: 'add-company',
          title: 'Add company information',
          description: 'Tell us about your company to get personalized recommendations',
          completed: false,
          action: {
            label: 'Add company',
            href: '/dashboard/settings/profile'
          },
          priority: 'medium'
        });
      }

      if (!profile?.avatar_url) {
        newTasks.push({
          id: 'upload-avatar',
          title: 'Upload profile picture',
          description: 'Add a profile picture to make your account more personal',
          completed: false,
          action: {
            label: 'Upload photo',
            href: '/dashboard/settings/profile'
          },
          priority: 'low'
        });
      }

      // Agent setup tasks
      if (agentCount === 0) {
        newTasks.push({
          id: 'create-first-agent',
          title: 'Create your first AI agent',
          description: 'Set up your first AI agent to start automating customer interactions',
          completed: false,
          action: {
            label: 'Create agent',
            href: '/dashboard/agents'
          },
          priority: 'high'
        });
      } else if (agentCount > 0 && agentCount < 3) {
        newTasks.push({
          id: 'create-more-agents',
          title: 'Create more agents',
          description: 'Expand your automation with different types of AI agents',
          completed: false,
          action: {
            label: 'Add agents',
            href: '/dashboard/agents'
          },
          priority: 'medium'
        });
      }

      // Integration tasks
      newTasks.push({
        id: 'setup-integration',
        title: 'Connect your first integration',
        description: 'Connect WhatsApp, Slack, or other platforms to deploy your agents',
        completed: false,
        action: {
          label: 'Browse integrations',
          href: '/dashboard/integrations'
        },
        priority: 'medium'
      });

      // Knowledge base tasks
      newTasks.push({
        id: 'upload-knowledge',
        title: 'Upload knowledge base',
        description: 'Add documents and FAQs to train your AI agents',
        completed: false,
        action: {
          label: 'Add knowledge',
          href: '/dashboard/knowledge'
        },
        priority: 'medium'
      });

      // API setup task
      newTasks.push({
        id: 'test-api',
        title: 'Test the API',
        description: 'Try out the Ojastack API to integrate with your applications',
        completed: false,
        action: {
          label: 'View API docs',
          href: '/dashboard/api'
        },
        priority: 'low'
      });

      setTasks(newTasks);
      setLoading(false);
    };

    generateTasks();
  }, [user, profile, profileLoading, agentCount]);

  const completedTasks = tasks.filter(task => task.completed);
  const pendingTasks = tasks.filter(task => !task.completed);
  const highPriorityTasks = pendingTasks.filter(task => task.priority === 'high');
  
  const completionPercentage = tasks.length > 0 
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  const markTaskCompleted = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    ));
  };

  return {
    tasks,
    completedTasks,
    pendingTasks,
    highPriorityTasks,
    completionPercentage,
    loading,
    markTaskCompleted,
    hasIncompleteTasks: pendingTasks.length > 0,
    nextTask: highPriorityTasks[0] || pendingTasks[0],
  };
}