import React, { useState, useEffect } from 'react';
import { AgentPersona, ExpertiseDomain, KnowledgeLevel } from '@/lib/persona-types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  BookOpen,
  Briefcase,
  Globe,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpertiseStepProps {
  personaData: Partial<AgentPersona>;
  onUpdate: (data: Partial<AgentPersona>) => void;
  onNext: () => void;
  onPrevious: () => void;
  errors: Record<string, string>;
}

const knowledgeLevels: Array<{ value: KnowledgeLevel; label: string; description: string }> = [
  { value: 'basic', label: 'Basic', description: 'Fundamental knowledge and concepts' },
  { value: 'intermediate', label: 'Intermediate', description: 'Good understanding with some experience' },
  { value: 'advanced', label: 'Advanced', description: 'Deep knowledge with extensive experience' },
  { value: 'expert', label: 'Expert', description: 'Comprehensive mastery and specialization' },
  { value: 'specialist', label: 'Specialist', description: 'Highly specialized domain expert' }
];

const commonDomains = [
  'Customer Service',
  'Technical Support',
  'Sales & Marketing',
  'Healthcare',
  'Finance & Banking',
  'Education',
  'Legal Services',
  'Human Resources',
  'E-commerce',
  'Software Development',
  'Data Analysis',
  'Project Management',
  'Real Estate',
  'Travel & Hospitality',
  'Food & Beverage'
];

const commonIndustries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Government',
  'Non-profit',
  'Entertainment',
  'Transportation',
  'Energy',
  'Agriculture',
  'Construction',
  'Telecommunications',
  'Consulting'
];

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' }
];

export default function ExpertiseStep({
  personaData,
  onUpdate,
  onNext,
  onPrevious,
  errors
}: ExpertiseStepProps) {
  const [domains, setDomains] = useState<ExpertiseDomain[]>(
    personaData.expertiseConfig?.domains || []
  );
  const [knowledgeLevel, setKnowledgeLevel] = useState<KnowledgeLevel>(
    personaData.expertiseConfig?.knowledgeLevel || 'intermediate'
  );
  const [specializations, setSpecializations] = useState<string[]>(
    personaData.expertiseConfig?.specializations || []
  );
  const [industries, setIndustries] = useState<string[]>(
    personaData.expertiseConfig?.industries || []
  );
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    personaData.expertiseConfig?.languages || ['en']
  );
  
  const [newDomain, setNewDomain] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');

  // Update persona data when values change
  useEffect(() => {
    const updatedExpertiseConfig = {
      ...personaData.expertiseConfig,
      domains,
      knowledgeLevel,
      specializations,
      industries,
      languages: selectedLanguages
    };

    onUpdate({
      ...personaData,
      expertiseConfig: updatedExpertiseConfig
    });
  }, [domains, knowledgeLevel, specializations, industries, selectedLanguages]);

  const addDomain = (domainName: string, level: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate') => {
    if (domainName.trim() && !domains.find(d => d.name.toLowerCase() === domainName.toLowerCase())) {
      setDomains([...domains, { name: domainName.trim(), level }]);
      setNewDomain('');
    }
  };

  const removeDomain = (index: number) => {
    setDomains(domains.filter((_, i) => i !== index));
  };

  const updateDomainLevel = (index: number, level: 'beginner' | 'intermediate' | 'advanced' | 'expert') => {
    const updatedDomains = [...domains];
    updatedDomains[index].level = level;
    setDomains(updatedDomains);
  };

  const addSpecialization = (spec: string) => {
    if (spec.trim() && !specializations.includes(spec.trim())) {
      setSpecializations([...specializations, spec.trim()]);
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setSpecializations(specializations.filter(s => s !== spec));
  };

  const toggleIndustry = (industry: string) => {
    if (industries.includes(industry)) {
      setIndustries(industries.filter(i => i !== industry));
    } else {
      setIndustries([...industries, industry]);
    }
  };

  const toggleLanguage = (langCode: string) => {
    if (selectedLanguages.includes(langCode)) {
      if (selectedLanguages.length > 1) { // Keep at least one language
        setSelectedLanguages(selectedLanguages.filter(l => l !== langCode));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, langCode]);
    }
  };

  const handleSubmit = () => {
    onNext();
  };

  return (
    <div className="space-y-8">
      {/* Knowledge Level */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Overall Knowledge Level <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            What's the general expertise level of your agent?
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {knowledgeLevels.map(level => (
            <Card
              key={level.value}
              className={cn(
                'p-4 cursor-pointer transition-all hover:shadow-md',
                knowledgeLevel === level.value 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'hover:border-gray-300'
              )}
              onClick={() => setKnowledgeLevel(level.value)}
            >
              <div className="flex items-start space-x-3">
                <BookOpen className={cn(
                  'w-5 h-5 mt-0.5',
                  knowledgeLevel === level.value ? 'text-blue-600' : 'text-gray-600'
                )} />
                <div>
                  <h4 className={cn(
                    'font-medium text-sm',
                    knowledgeLevel === level.value ? 'text-blue-900' : 'text-gray-900'
                  )}>
                    {level.label}
                  </h4>
                  <p className={cn(
                    'text-xs',
                    knowledgeLevel === level.value ? 'text-blue-700' : 'text-gray-600'
                  )}>
                    {level.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Expertise Domains */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Expertise Domains
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            What areas does your agent have knowledge in?
          </p>
        </div>

        {/* Quick Add Common Domains */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Quick Add</Label>
          <div className="flex flex-wrap gap-2">
            {commonDomains.map(domain => (
              <Badge
                key={domain}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => addDomain(domain)}
              >
                <Plus className="w-3 h-3 mr-1" />
                {domain}
              </Badge>
            ))}
          </div>
        </div>

        {/* Custom Domain Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Add custom expertise domain..."
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addDomain(newDomain)}
          />
          <Button 
            onClick={() => addDomain(newDomain)}
            disabled={!newDomain.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Selected Domains */}
        {domains.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Selected Domains</Label>
            {domains.map((domain, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{domain.name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={domain.level}
                      onChange={(e) => updateDomainLevel(index, e.target.value as any)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDomain(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Specializations */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Specializations
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Specific areas of deep expertise or focus
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="e.g., Machine Learning, Customer Retention, Tax Planning..."
            value={newSpecialization}
            onChange={(e) => setNewSpecialization(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSpecialization(newSpecialization)}
          />
          <Button 
            onClick={() => addSpecialization(newSpecialization)}
            disabled={!newSpecialization.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {specializations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {specializations.map(spec => (
              <Badge key={spec} variant="secondary" className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                {spec}
                <button
                  onClick={() => removeSpecialization(spec)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Industries */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Industries
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Which industries does your agent understand?
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {commonIndustries.map(industry => (
            <Badge
              key={industry}
              variant={industries.includes(industry) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleIndustry(industry)}
            >
              <Briefcase className="w-3 h-3 mr-1" />
              {industry}
            </Badge>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Languages <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            What languages can your agent communicate in?
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {languages.map(lang => (
            <Badge
              key={lang.code}
              variant={selectedLanguages.includes(lang.code) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleLanguage(lang.code)}
            >
              <Globe className="w-3 h-3 mr-1" />
              {lang.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Summary */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-3">Expertise Summary</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Knowledge Level:</strong> {knowledgeLevel}
          </p>
          {domains.length > 0 && (
            <p>
              <strong>Domains:</strong> {domains.map(d => `${d.name} (${d.level})`).join(', ')}
            </p>
          )}
          {specializations.length > 0 && (
            <p>
              <strong>Specializations:</strong> {specializations.join(', ')}
            </p>
          )}
          {industries.length > 0 && (
            <p>
              <strong>Industries:</strong> {industries.join(', ')}
            </p>
          )}
          <p>
            <strong>Languages:</strong> {selectedLanguages.map(code => 
              languages.find(l => l.code === code)?.name
            ).join(', ')}
          </p>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onPrevious}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button onClick={handleSubmit}>
          Continue to Behavior
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}