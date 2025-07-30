import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    MessageSquare,
    Search,
    Filter,
    Clock,
    User,
    Phone,
    Mail,
    Calendar,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    XCircle,
    MoreHorizontal,
    Eye,
    Archive,
    Trash2,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { Link } from "react-router-dom";

interface ConversationWithDetails {
    id: string;
    agent_id: string;
    customer_id: string;
    channel: string;
    status: 'active' | 'completed' | 'escalated';
    customer_name?: string;
    customer_phone?: string;
    intent?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    created_at: string;
    updated_at: string;
    message_count: number;
    duration_minutes: number;
    agent?: {
        id: string;
        name: string;
        type: string;
        status: string;
    };
}

interface ConversationStats {
    total_conversations: number;
    active_conversations: number;
    completed_conversations: number;
    escalated_conversations: number;
    average_duration: number;
    total_messages: number;
    satisfaction_average: number;
}

export default function Conversations() {
    const { user, session } = useAuth();
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [stats, setStats] = useState<ConversationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [channelFilter, setChannelFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchConversations();
        fetchStats();
    }, [currentPage, statusFilter, channelFilter, searchQuery]);

    const fetchConversations = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '20',
            });

            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (channelFilter !== 'all') params.append('channel', channelFilter);
            if (searchQuery) params.append('search', searchQuery);

            const response = await fetch(`/.netlify/functions/conversations?${params}`, {
                headers: {
                    'Authorization': `Bearer ${(session as any)?.access_token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations || []);
                setTotalPages(Math.ceil((data.pagination?.total || 0) / 20));
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            // For now, calculate stats from conversations data
            // In production, you'd have a dedicated stats endpoint
            const mockStats: ConversationStats = {
                total_conversations: conversations.length,
                active_conversations: conversations.filter(c => c.status === 'active').length,
                completed_conversations: conversations.filter(c => c.status === 'completed').length,
                escalated_conversations: conversations.filter(c => c.status === 'escalated').length,
                average_duration: conversations.length > 0
                    ? conversations.reduce((sum, c) => sum + c.duration_minutes, 0) / conversations.length
                    : 0,
                total_messages: conversations.reduce((sum, c) => sum + c.message_count, 0),
                satisfaction_average: 4.2, // Mock value
            };
            setStats(mockStats);
        } catch (error) {
            console.error('Error calculating stats:', error);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        setCurrentPage(1);
    };

    const handleChannelFilter = (channel: string) => {
        setChannelFilter(channel);
        setCurrentPage(1);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'completed': return 'bg-blue-500';
            case 'escalated': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <MessageSquare className="h-4 w-4" />;
            case 'completed': return <CheckCircle className="h-4 w-4" />;
            case 'escalated': return <AlertTriangle className="h-4 w-4" />;
            default: return <XCircle className="h-4 w-4" />;
        }
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'whatsapp': return '📱';
            case 'slack': return '💬';
            case 'email': return '📧';
            case 'web': return '🌐';
            default: return '💭';
        }
    };

    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return 'text-green-600';
            case 'negative': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Conversations</h1>
                        <p className="text-muted-foreground">Monitor and manage all agent conversations</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-4 bg-muted rounded w-3/4"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-muted rounded w-1/2"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Conversations</h1>
                    <p className="text-muted-foreground">Monitor and manage all agent conversations</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_conversations}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.active_conversations} active
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatDuration(stats.average_duration)}</div>
                            <p className="text-xs text-muted-foreground">
                                Per conversation
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.satisfaction_average > 0 ? stats.satisfaction_average.toFixed(1) : 'N/A'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Average rating
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Messages</CardTitle>
                            <Mail className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_messages}</div>
                            <p className="text-xs text-muted-foreground">
                                Total exchanged
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Filter className="h-5 w-5 mr-2" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Select value={statusFilter} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="escalated">Escalated</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={channelFilter} onValueChange={handleChannelFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Channel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Channels</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="web">Web</SelectItem>
                                <SelectItem value="slack">Slack</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Conversations List */}
            <Tabs defaultValue="list" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="list">List View</TabsTrigger>
                    <TabsTrigger value="grid">Grid View</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                    {conversations.length === 0 ? (
                        <Card className="text-center py-12">
                            <CardContent>
                                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No conversations found</h3>
                                <p className="text-muted-foreground">
                                    No conversations match your current filters.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {conversations.map((conversation) => (
                                <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-lg">{getChannelIcon(conversation.channel)}</span>
                                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(conversation.status)}`}></div>
                                                </div>

                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h3 className="font-semibold">
                                                            {conversation.customer_name || conversation.customer_id}
                                                        </h3>
                                                        <Badge variant="outline" className="text-xs">
                                                            {conversation.channel}
                                                        </Badge>
                                                        <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                                                            {getStatusIcon(conversation.status)}
                                                            <span className="ml-1">{conversation.status}</span>
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                                        <span className="flex items-center">
                                                            <User className="h-3 w-3 mr-1" />
                                                            {conversation.agent?.name || 'Unknown Agent'}
                                                        </span>
                                                        <span className="flex items-center">
                                                            <MessageSquare className="h-3 w-3 mr-1" />
                                                            {conversation.message_count} messages
                                                        </span>
                                                        <span className="flex items-center">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            {formatDuration(conversation.duration_minutes)}
                                                        </span>
                                                        <span className="flex items-center">
                                                            <Calendar className="h-3 w-3 mr-1" />
                                                            {new Date(conversation.created_at).toLocaleDateString()}
                                                        </span>
                                                        {conversation.sentiment && (
                                                            <span className={`flex items-center ${getSentimentColor(conversation.sentiment)}`}>
                                                                {conversation.sentiment === 'positive' ? '😊' :
                                                                    conversation.sentiment === 'negative' ? '😞' : '😐'}
                                                                {conversation.sentiment}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link to={`/dashboard/conversations/${conversation.id}`}>
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                    </Link>
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>
                                                            <Archive className="h-4 w-4 mr-2" />
                                                            Archive
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive">
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="grid" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {conversations.map((conversation) => (
                            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg">{getChannelIcon(conversation.channel)}</span>
                                            <CardTitle className="text-lg">
                                                {conversation.customer_name || conversation.customer_id}
                                            </CardTitle>
                                        </div>
                                        <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                                            {conversation.status}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        {conversation.agent?.name || 'Unknown Agent'} • {conversation.channel}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Messages:</span>
                                        <span className="font-medium">{conversation.message_count}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Duration:</span>
                                        <span className="font-medium">{formatDuration(conversation.duration_minutes)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Started:</span>
                                        <span className="font-medium">
                                            {new Date(conversation.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {conversation.sentiment && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Sentiment:</span>
                                            <span className={`font-medium ${getSentimentColor(conversation.sentiment)}`}>
                                                {conversation.sentiment}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex space-x-2 pt-2">
                                        <Button variant="outline" size="sm" className="flex-1" asChild>
                                            <Link to={`/dashboard/conversations/${conversation.id}`}>
                                                <Eye className="h-3 w-3 mr-1" />
                                                View
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}