/**
 * Template Collection Manager
 * Allows users to create and manage curated collections of templates
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Download,
  Users,
  Calendar,
  Search,
  Filter,
  Grid,
  List,
  BookOpen,
  Heart,
  Share2,
  Copy
} from 'lucide-react';
import { templateManager, type AgentTemplate } from '../../lib/template-manager';
import { supabase } from '../../lib/supabase';

interface TemplateCollection {
  id: string;
  name: string;
  description: string;
  curatorId: string;
  curatorName: string;
  isPublic: boolean;
  isOfficial: boolean;
  coverImage?: string;
  colorTheme?: string;
  templateIds: string[];
  templates: AgentTemplate[];
  createdAt: string;
  updatedAt: string;
  stats: {
    templateCount: number;
    totalDownloads: number;
    averageRating: number;
    followers: number;
  };
}

interface TemplateCollectionManagerProps {
  className?: string;
}

export const TemplateCollectionManager: React.FC<TemplateCollectionManagerProps> = ({
  className = ''
}) => {
  const [collections, setCollections] = useState<TemplateCollection[]>([]);
  const [userCollections, setUserCollections] = useState<TemplateCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<TemplateCollection | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<TemplateCollection | null>(null);
  const [user, setUser] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    colorTheme: '#3B82F6'
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      searchCollections();
    } else {
      loadPublicCollections();
    }
  }, [searchTerm]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      await Promise.all([
        loadPublicCollections(),
        loadUserCollections(currentUser?.id)
      ]);

    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPublicCollections = async () => {
    try {
      // Mock data - replace with actual API call
      const mockCollections: TemplateCollection[] = [
        {
          id: '1',
          name: 'Customer Service Essentials',
          description: 'Essential templates for customer service teams',
          curatorId: 'curator1',
          curatorName: 'Sarah Johnson',
          isPublic: true,
          isOfficial: true,
          colorTheme: '#10B981',
          templateIds: ['t1', 't2', 't3'],
          templates: [],
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T15:30:00Z',
          stats: {
            templateCount: 8,
            totalDownloads: 2341,
            averageRating: 4.6,
            followers: 156
          }
        },
        {
          id: '2',
          name: 'Sales Automation Suite',
          description: 'Complete sales automation templates for modern teams',
          curatorId: 'curator2',
          curatorName: 'Mike Chen',
          isPublic: true,
          isOfficial: false,
          colorTheme: '#3B82F6',
          templateIds: ['t4', 't5', 't6'],
          templates: [],
          createdAt: '2024-01-10T08:00:00Z',
          updatedAt: '2024-01-18T12:00:00Z',
          stats: {
            templateCount: 12,
            totalDownloads: 1987,
            averageRating: 4.4,
            followers: 89
          }
        },
        {
          id: '3',
          name: 'E-commerce Helpers',
          description: 'Templates to boost your online store performance',
          curatorId: 'curator3',
          curatorName: 'Emma Davis',
          isPublic: true,
          isOfficial: false,
          colorTheme: '#F59E0B',
          templateIds: ['t7', 't8', 't9'],
          templates: [],
          createdAt: '2024-01-05T14:00:00Z',
          updatedAt: '2024-01-15T09:30:00Z',
          stats: {
            templateCount: 6,
            totalDownloads: 1654,
            averageRating: 4.2,
            followers: 67
          }
        }
      ];

      setCollections(mockCollections);
    } catch (error) {
      console.error('Failed to load public collections:', error);
    }
  };

  const loadUserCollections = async (userId?: string) => {
    if (!userId) return;

    try {
      // Mock data - replace with actual API call
      const mockUserCollections: TemplateCollection[] = [
        {
          id: 'user1',
          name: 'My Favorites',
          description: 'Templates I use most often',
          curatorId: userId,
          curatorName: 'You',
          isPublic: false,
          isOfficial: false,
          colorTheme: '#8B5CF6',
          templateIds: ['t1', 't4', 't7'],
          templates: [],
          createdAt: '2024-01-20T10:00:00Z',
          updatedAt: '2024-01-22T15:30:00Z',
          stats: {
            templateCount: 5,
            totalDownloads: 0,
            averageRating: 4.5,
            followers: 0
          }
        }
      ];

      setUserCollections(mockUserCollections);
    } catch (error) {
      console.error('Failed to load user collections:', error);
    }
  };

  const searchCollections = async () => {
    try {
      // Filter collections based on search term
      const filtered = collections.filter(collection =>
        collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.curatorName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setCollections(filtered);
    } catch (error) {
      console.error('Failed to search collections:', error);
    }
  };

  const handleCreateCollection = async () => {
    if (!user) {
      alert('Please log in to create collections');
      return;
    }

    try {
      const newCollection: TemplateCollection = {
        id: `new_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        curatorId: user.id,
        curatorName: user.user_metadata?.full_name || 'You',
        isPublic: formData.isPublic,
        isOfficial: false,
        colorTheme: formData.colorTheme,
        templateIds: [],
        templates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: {
          templateCount: 0,
          totalDownloads: 0,
          averageRating: 0,
          followers: 0
        }
      };

      setUserCollections(prev => [newCollection, ...prev]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', isPublic: true, colorTheme: '#3B82F6' });
      
      alert('Collection created successfully!');
    } catch (error) {
      console.error('Failed to create collection:', error);
      alert('Failed to create collection. Please try again.');
    }
  };

  const handleUpdateCollection = async () => {
    if (!editingCollection) return;

    try {
      const updatedCollection = {
        ...editingCollection,
        name: formData.name,
        description: formData.description,
        isPublic: formData.isPublic,
        colorTheme: formData.colorTheme,
        updatedAt: new Date().toISOString()
      };

      setUserCollections(prev =>
        prev.map(col => col.id === editingCollection.id ? updatedCollection : col)
      );

      setEditingCollection(null);
      setFormData({ name: '', description: '', isPublic: true, colorTheme: '#3B82F6' });
      
      alert('Collection updated successfully!');
    } catch (error) {
      console.error('Failed to update collection:', error);
      alert('Failed to update collection. Please try again.');
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      setUserCollections(prev => prev.filter(col => col.id !== collectionId));
      alert('Collection deleted successfully!');
    } catch (error) {
      console.error('Failed to delete collection:', error);
      alert('Failed to delete collection. Please try again.');
    }
  };

  const handleFollowCollection = async (collectionId: string) => {
    if (!user) {
      alert('Please log in to follow collections');
      return;
    }

    try {
      // Update follower count
      setCollections(prev =>
        prev.map(col =>
          col.id === collectionId
            ? { ...col, stats: { ...col.stats, followers: col.stats.followers + 1 } }
            : col
        )
      );
      
      alert('Collection followed!');
    } catch (error) {
      console.error('Failed to follow collection:', error);
    }
  };

  const renderCollectionCard = (collection: TemplateCollection, isUserCollection: boolean = false) => (
    <Card 
      key={collection.id} 
      className="hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => setSelectedCollection(collection)}
    >
      <CardHeader 
        className="pb-3"
        style={{ backgroundColor: `${collection.colorTheme}10` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                {collection.name}
              </CardTitle>
              {collection.isOfficial && (
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  Official
                </Badge>
              )}
              {!collection.isPublic && (
                <Badge variant="outline">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Private
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm line-clamp-2">
              {collection.description}
            </CardDescription>
          </div>
          
          {isUserCollection && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCollection(collection);
                  setFormData({
                    name: collection.name,
                    description: collection.description,
                    isPublic: collection.isPublic,
                    colorTheme: collection.colorTheme || '#3B82F6'
                  });
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCollection(collection.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Curator Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-3 w-3" />
            <span>by {collection.curatorName}</span>
            <span>•</span>
            <Calendar className="h-3 w-3" />
            <span>{new Date(collection.updatedAt).toLocaleDateString()}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{collection.stats.templateCount} templates</span>
              </div>
              
              {collection.stats.totalDownloads > 0 && (
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{collection.stats.totalDownloads}</span>
                </div>
              )}
              
              {collection.stats.averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{collection.stats.averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {collection.stats.followers > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <Heart className="h-3 w-3" />
                <span>{collection.stats.followers}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCollection(collection);
              }}
            >
              <Eye className="h-3 w-3 mr-2" />
              View
            </Button>
            
            {!isUserCollection && collection.isPublic && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFollowCollection(collection.id);
                }}
              >
                <Heart className="h-3 w-3 mr-2" />
                Follow
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(window.location.origin + `/collections/${collection.id}`);
                alert('Collection link copied!');
              }}
            >
              <Share2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCreateEditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingCollection ? 'Edit Collection' : 'Create New Collection'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter collection name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your collection"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Color Theme</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.colorTheme}
                  onChange={(e) => setFormData(prev => ({ ...prev, colorTheme: e.target.value }))}
                  className="w-12 h-8 rounded border"
                />
                <Input
                  value={formData.colorTheme}
                  onChange={(e) => setFormData(prev => ({ ...prev, colorTheme: e.target.value }))}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              />
              <label htmlFor="isPublic" className="text-sm">
                Make this collection public
              </label>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-6">
            <Button
              onClick={editingCollection ? handleUpdateCollection : handleCreateCollection}
              disabled={!formData.name.trim()}
              className="flex-1"
            >
              {editingCollection ? 'Update' : 'Create'} Collection
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingCollection(null);
                setFormData({ name: '', description: '', isPublic: true, colorTheme: '#3B82F6' });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Template Collections</h1>
          <p className="text-gray-600">Discover curated collections of templates</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          
          {user && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search collections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* User Collections */}
      {user && userCollections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">My Collections</h2>
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {userCollections.map(collection => renderCollectionCard(collection, true))}
          </div>
        </div>
      )}

      {/* Public Collections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          {user && userCollections.length > 0 ? 'Discover Collections' : 'All Collections'}
        </h2>
        
        {collections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No collections found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Be the first to create a collection!'}
              </p>
              {user && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Collection
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {collections.map(collection => renderCollectionCard(collection))}
          </div>
        )}
      </div>

      {/* Modals */}
      {(showCreateModal || editingCollection) && renderCreateEditModal()}

      {/* Collection Detail Modal */}
      {selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedCollection.name}</h2>
                  <p className="text-gray-600 mb-4">{selectedCollection.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>by {selectedCollection.curatorName}</span>
                    <span>•</span>
                    <span>{selectedCollection.stats.templateCount} templates</span>
                    <span>•</span>
                    <span>{selectedCollection.stats.followers} followers</span>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setSelectedCollection(null)}>
                  ×
                </Button>
              </div>
            </div>
            
            <div className="p-6 overflow-auto">
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4" />
                <p>Template list would be displayed here</p>
                <p className="text-sm">Integration with template system needed</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateCollectionManager;