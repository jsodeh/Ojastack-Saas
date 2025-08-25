import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { fetchAgentTemplate, type AgentTemplate } from '@/lib/agent-service';
import AgentCreationWizard from '@/components/agent-creation/AgentCreationWizard';

export default function CreateAgentPage() {
  const [searchParams] = useSearchParams();
  const { templateId: urlTemplateId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [template, setTemplate] = useState<AgentTemplate | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for template ID in URL params first, then query params
    const templateId = urlTemplateId || searchParams.get('template');
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [searchParams, urlTemplateId]);

  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      const templateData = await fetchAgentTemplate(templateId);
      if (templateData) {
        setTemplate(templateData);
      } else {
        toast({
          title: "Template not found",
          description: "The requested template could not be found.",
          variant: "destructive",
        });
        navigate('/dashboard/agents');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: "Error loading template",
        description: "Failed to load the template. Please try again.",
        variant: "destructive",
      });
      navigate('/dashboard/agents');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (agentId: string) => {
    toast({
      title: "Agent Created Successfully!",
      description: "Your agent has been deployed and is ready to use.",
    });
    navigate(`/dashboard/agents/${agentId}`);
  };

  const handleCancel = () => {
    navigate('/dashboard/agents');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <AgentCreationWizard
      template={template}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}