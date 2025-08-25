import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings,
  Crown,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  FileText,
  Database,
  Zap,
  Globe,
  Lock,
  Unlock,
  Copy,
  Send,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  permissions: string[];
  lastActive: Date;
  joinedAt: Date;
  invitedBy: string;
  twoFactorEnabled: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'agents' | 'analytics' | 'team' | 'integrations' | 'billing';
  isSystem: boolean;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'expired' | 'accepted' | 'declined';
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
}

interface TeamManagementInterfaceProps {
  organizationId?: string;
}

const DEFAULT_PERMISSIONS: Permission[] = [
  // Agents
  { id: 'agents:create', name: 'Create Agents', description: 'Create new AI agents', category: 'agents', isSystem: true },
  { id: 'agents:edit', name: 'Edit Agents', description: 'Modify existing agents', category: 'agents', isSystem: true },
  { id: 'agents:delete', name: 'Delete Agents', description: 'Delete agents', category: 'agents', isSystem: true },
  { id: 'agents:test', name: 'Test Agents', description: 'Test agent functionality', category: 'agents', isSystem: true },
  
  // Analytics
  { id: 'analytics:view', name: 'View Analytics', description: 'Access analytics dashboards', category: 'analytics', isSystem: true },
  { id: 'analytics:export', name: 'Export Analytics', description: 'Export analytics data', category: 'analytics', isSystem: true },
  
  // Team
  { id: 'team:invite', name: 'Invite Members', description: 'Send team invitations', category: 'team', isSystem: true },
  { id: 'team:manage', name: 'Manage Team', description: 'Manage team members and roles', category: 'team', isSystem: true },
  
  // Integrations
  { id: 'integrations:manage', name: 'Manage Integrations', description: 'Configure integrations', category: 'integrations', isSystem: true },
  { id: 'integrations:credentials', name: 'Manage Credentials', description: 'Access integration credentials', category: 'integrations', isSystem: true },
  
  // Billing
  { id: 'billing:view', name: 'View Billing', description: 'Access billing information', category: 'billing', isSystem: true },
  { id: 'billing:manage', name: 'Manage Billing', description: 'Modify billing settings', category: 'billing', isSystem: true }
];

const SYSTEM_ROLES: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full access to everything',
    permissions: DEFAULT_PERMISSIONS.map(p => p.id),
    isSystem: true,
    memberCount: 0
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access except billing management',
    permissions: DEFAULT_PERMISSIONS.filter(p => p.id !== 'billing:manage').map(p => p.id),
    isSystem: true,
    memberCount: 0
  },
  {
    id: 'editor',
    name: 'Editor',
    description: 'Can create and edit agents',
    permissions: ['agents:create', 'agents:edit', 'agents:test', 'analytics:view', 'integrations:manage'],
    isSystem: true,
    memberCount: 0
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: ['analytics:view'],
    isSystem: true,
    memberCount: 0
  }
];

export default function TeamManagementInterface({ organizationId }: TeamManagementInterfaceProps) {
  const [selectedTab, setSelectedTab] = useState('members');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Fetch team members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members', organizationId],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Mock data for demonstration
      return [
        {
          id: '1',
          email: 'john.doe@company.com',
          name: 'John Doe',
          role: 'owner',
          status: 'active',
          permissions: SYSTEM_ROLES.find(r => r.id === 'owner')?.permissions || [],
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
          joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          invitedBy: '',
          twoFactorEnabled: true
        },
        {
          id: '2',
          email: 'sarah.wilson@company.com',
          name: 'Sarah Wilson',
          role: 'admin',
          status: 'active',
          permissions: SYSTEM_ROLES.find(r => r.id === 'admin')?.permissions || [],
          lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000),
          joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          invitedBy: '1',
          twoFactorEnabled: false
        },
        {
          id: '3',
          email: 'mike.johnson@company.com',
          name: 'Mike Johnson',
          role: 'editor',
          status: 'active',
          permissions: SYSTEM_ROLES.find(r => r.id === 'editor')?.permissions || [],
          lastActive: new Date(Date.now() - 6 * 60 * 60 * 1000),
          joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          invitedBy: '1',
          twoFactorEnabled: true
        }
      ];
    }
  });

  // Fetch roles
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<Role[]> => {
      // In real app, fetch custom roles from database and merge with system roles
      return SYSTEM_ROLES.map(role => ({
        ...role,
        memberCount: members?.filter(m => m.role === role.id).length || 0
      }));
    },
    enabled: !!members
  });

  // Fetch pending invitations
  const { data: invitations } = useQuery({
    queryKey: ['team-invitations'],
    queryFn: async (): Promise<Invitation[]> => {
      return [
        {
          id: '1',
          email: 'newuser@company.com',
          role: 'editor',
          status: 'pending',
          invitedBy: 'John Doe',
          invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        }
      ];
    }
  });

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const response = await fetch('/.netlify/functions/invite-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, organizationId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      setShowInviteDialog(false);
      setInviteEmail('');
      toast.success('Invitation sent successfully');
    },
    onError: (error) => {
      toast.error('Failed to send invitation: ' + error.message);
    }
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: string; updates: Partial<TeamMember> }) => {
      // Use fetch API for team member operations
      const response = await fetch('/.netlify/functions/update-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, updates })
      });
      
      if (!response.ok) throw new Error('Failed to update member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Member updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update member: ' + error.message);
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch('/.netlify/functions/remove-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });
      
      if (!response.ok) throw new Error('Failed to remove member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Member removed successfully');
    },
    onError: (error) => {
      toast.error('Failed to remove member: ' + error.message);
    }
  });

  const handleInviteMember = () => {
    if (!inviteEmail || !inviteRole) {
      toast.error('Please enter email and select role');
      return;
    }
    
    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleUpdateMemberRole = (memberId: string, newRole: string) => {
    const newPermissions = SYSTEM_ROLES.find(r => r.id === newRole)?.permissions || [];
    updateMemberMutation.mutate({
      memberId,
      updates: { role: newRole as any, permissions: newPermissions }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      removeMemberMutation.mutate(memberId);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'editor': return <Edit className="w-4 h-4 text-green-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: TeamMember['status']) => {
    const variants = {
      active: 'default',
      pending: 'secondary',
      suspended: 'destructive'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Team Management</h3>
          <p className="text-muted-foreground">
            Manage team members, roles, and permissions for your organization
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members?.filter(m => {
                const timeDiff = Date.now() - m.lastActive.getTime();
                return timeDiff < 30 * 60 * 1000; // Last 30 minutes
              }).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles?.filter(r => !r.isSystem).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage your team members and their access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : members && members.length > 0 ? (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{member.name}</h4>
                            {member.twoFactorEnabled && (
                              <Shield className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(member.status)}
                            <div className="flex items-center gap-1">
                              {getRoleIcon(member.role)}
                              <span className="text-sm capitalize">{member.role}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right text-sm text-muted-foreground">
                          <p>Last active: {member.lastActive.toLocaleDateString()}</p>
                          <p>Joined: {member.joinedAt.toLocaleDateString()}</p>
                        </div>
                        
                        {member.role !== 'owner' && (
                          <div className="flex items-center space-x-2">
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => handleUpdateMemberRole(member.id, newRole)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roles?.filter(r => r.id !== 'owner').map(role => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMember(member)}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No team members</h3>
                  <p className="text-muted-foreground mb-4">
                    Invite your first team member to get started.
                  </p>
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">Roles & Permissions</h4>
            <Button onClick={() => setShowRoleDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles?.map(role => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getRoleIcon(role.id)}
                      {role.name}
                    </CardTitle>
                    <Badge variant="outline">{role.memberCount} members</Badge>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h5 className="font-medium">Permissions:</h5>
                    <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                      {role.permissions.map(permissionId => {
                        const permission = DEFAULT_PERMISSIONS.find(p => p.id === permissionId);
                        return permission ? (
                          <div key={permissionId} className="flex items-center justify-between text-sm">
                            <span>{permission.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {permission.category}
                            </Badge>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Manage outstanding team invitations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations && invitations.length > 0 ? (
                <div className="space-y-4">
                  {invitations.map(invitation => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{invitation.email}</h4>
                        <p className="text-sm text-muted-foreground">
                          Invited by {invitation.invitedBy} • {invitation.invitedAt.toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{invitation.role}</Badge>
                          <Badge 
                            variant={invitation.status === 'pending' ? 'default' : 'secondary'}
                          >
                            {invitation.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending invitations</h3>
                  <p className="text-muted-foreground">
                    All team invitations have been accepted or expired.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>
                Recent team actions and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Activity log coming soon</h3>
                <p className="text-muted-foreground">
                  Team activity tracking will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your team
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles?.filter(r => r.id !== 'owner').map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role.id)}
                        <span>{role.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteMember}
              disabled={inviteMemberMutation.isPending}
            >
              {inviteMemberMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}