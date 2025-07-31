import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Phone,
  Key,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { whatsappCredentialManager, type WhatsAppCredentials, type WhatsAppCredentialsInput } from "@/lib/whatsapp-credential-manager";

interface WhatsAppCredentialManagerProps {
  onCredentialAdded?: (credential: WhatsAppCredentials) => void;
  onCredentialUpdated?: (credential: WhatsAppCredentials) => void;
  onCredentialDeleted?: (credentialId: string) => void;
}

export default function WhatsAppCredentialManager({
  onCredentialAdded,
  onCredentialUpdated,
  onCredentialDeleted
}: WhatsAppCredentialManagerProps) {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<WhatsAppCredentials[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCredential, setEditingCredential] = useState<WhatsAppCredentials | null>(null);
  const [formData, setFormData] = useState<WhatsAppCredentialsInput>({
    business_account_id: '',
    access_token: '',
    phone_number_id: '',
    phone_number: '',
    display_name: '',
    webhook_verify_token: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (user) {
      loadCredentials();
    }
  }, [user]);

  const loadCredentials = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userCredentials = await whatsappCredentialManager.getUserCredentials(user.id);
      setCredentials(userCredentials);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };  
const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.business_account_id.trim()) {
      errors.business_account_id = 'Business Account ID is required';
    }

    if (!formData.access_token.trim()) {
      errors.access_token = 'Access Token is required';
    }

    if (!formData.phone_number_id.trim()) {
      errors.phone_number_id = 'Phone Number ID is required';
    }

    if (!formData.phone_number.trim()) {
      errors.phone_number = 'Phone Number is required';
    }

    if (!formData.display_name.trim()) {
      errors.display_name = 'Display Name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    try {
      setSubmitting(true);
      setValidating(true);

      if (editingCredential) {
        // Update existing credential
        const updated = await whatsappCredentialManager.updateCredentials(
          editingCredential.id,
          formData
        );
        setCredentials(prev => prev.map(c => c.id === updated.id ? updated : c));
        onCredentialUpdated?.(updated);
      } else {
        // Add new credential
        const newCredential = await whatsappCredentialManager.storeCredentials(
          user.id,
          formData
        );
        setCredentials(prev => [...prev, newCredential]);
        onCredentialAdded?.(newCredential);
      }

      resetForm();
      setShowAddDialog(false);
      setEditingCredential(null);
    } catch (error) {
      console.error('Failed to save credential:', error);
      setFormErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
      setValidating(false);
    }
  };

  const handleDelete = async (credentialId: string) => {
    if (!confirm('Are you sure you want to delete this WhatsApp credential? This will also remove all associated agent configurations.')) {
      return;
    }

    try {
      await whatsappCredentialManager.deleteCredentials(credentialId);
      setCredentials(prev => prev.filter(c => c.id !== credentialId));
      onCredentialDeleted?.(credentialId);
    } catch (error) {
      console.error('Failed to delete credential:', error);
      alert('Failed to delete credential: ' + error.message);
    }
  };

  const handleEdit = (credential: WhatsAppCredentials) => {
    setEditingCredential(credential);
    setFormData({
      business_account_id: credential.business_account_id,
      access_token: '', // Don't pre-fill for security
      phone_number_id: credential.phone_number_id,
      phone_number: credential.phone_number,
      display_name: credential.display_name,
      webhook_verify_token: credential.webhook_verify_token
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      business_account_id: '',
      access_token: '',
      phone_number_id: '',
      phone_number: '',
      display_name: '',
      webhook_verify_token: ''
    });
    setFormErrors({});
    setShowToken(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'invalid':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Invalid</Badge>;
      case 'expired':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      case 'suspended':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Credentials</h2>
          <p className="text-muted-foreground">
            Manage your WhatsApp Business API credentials for agent integrations
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingCredential(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Credentials
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCredential ? 'Edit WhatsApp Credentials' : 'Add WhatsApp Credentials'}
              </DialogTitle>
              <DialogDescription>
                Enter your WhatsApp Business API credentials. These will be encrypted and stored securely.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_account_id">Business Account ID</Label>
                  <Input
                    id="business_account_id"
                    value={formData.business_account_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_account_id: e.target.value }))}
                    placeholder="123456789012345"
                    className={formErrors.business_account_id ? 'border-red-500' : ''}
                  />
                  {formErrors.business_account_id && (
                    <p className="text-sm text-red-500">{formErrors.business_account_id}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number_id">Phone Number ID</Label>
                  <Input
                    id="phone_number_id"
                    value={formData.phone_number_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number_id: e.target.value }))}
                    placeholder="123456789012345"
                    className={formErrors.phone_number_id ? 'border-red-500' : ''}
                  />
                  {formErrors.phone_number_id && (
                    <p className="text-sm text-red-500">{formErrors.phone_number_id}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+1234567890"
                    className={formErrors.phone_number ? 'border-red-500' : ''}
                  />
                  {formErrors.phone_number && (
                    <p className="text-sm text-red-500">{formErrors.phone_number}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="My Business"
                    className={formErrors.display_name ? 'border-red-500' : ''}
                  />
                  {formErrors.display_name && (
                    <p className="text-sm text-red-500">{formErrors.display_name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access_token">Access Token</Label>
                <div className="relative">
                  <Input
                    id="access_token"
                    type={showToken ? 'text' : 'password'}
                    value={formData.access_token}
                    onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                    placeholder="EAAxxxxxxxxxx..."
                    className={`pr-10 ${formErrors.access_token ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {formErrors.access_token && (
                  <p className="text-sm text-red-500">{formErrors.access_token}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_verify_token">Webhook Verify Token (Optional)</Label>
                <Input
                  id="webhook_verify_token"
                  value={formData.webhook_verify_token}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhook_verify_token: e.target.value }))}
                  placeholder="Leave empty to auto-generate"
                />
                <p className="text-sm text-muted-foreground">
                  If left empty, a secure token will be generated automatically
                </p>
              </div>

              {formErrors.submit && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formErrors.submit}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingCredential(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {validating ? 'Validating...' : editingCredential ? 'Update' : 'Add'} Credentials
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {credentials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No WhatsApp Credentials</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your WhatsApp Business API credentials to enable WhatsApp integration for your agents.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Credentials
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {credentials.map((credential) => (
            <Card key={credential.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{credential.display_name}</CardTitle>
                      <CardDescription>{credential.phone_number}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(credential.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(credential)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(credential.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Business Account ID</p>
                    <p className="font-mono">{credential.business_account_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone Number ID</p>
                    <p className="font-mono">{credential.phone_number_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Validated</p>
                    <p>{credential.last_validated ? new Date(credential.last_validated).toLocaleDateString() : 'Never'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p>{new Date(credential.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}