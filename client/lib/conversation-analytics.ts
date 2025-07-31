/**
 * Conversation Analytics
 * Tracks conversation quality, performance metrics, and user engagement
 */

interface ConversationMetrics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  mode: 'text' | 'voice' | 'video' | 'multimodal';
  
  // Message metrics
  totalMessages: number;
  userMessages: number;
  agentMessages: number;
  averageMessageLength: number;
  
  // Response metrics
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  responseTimeVariance: number;
  
  // Quality metrics
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  audioQuality?: number; // 0-1 scale
  videoQuality?: number; // 0-1 scale
  
  // Engagement metrics
  userEngagementScore: number; // 0-1 scale
  conversationSatisfaction?: number; // 1-5 scale
  
  // Mode switching (for multimodal)
  modeChanges?: number;
  modeDistribution?: Record<string, number>;
  
  // Error tracking
  errors: Array<{
    timestamp: Date;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  
  // Performance tracking
  memoryUsage?: number;
  cpuUsage?: number;
  networkLatency?: number;
}

interface QualityAssessment {
  overall: number; // 0-1 scale
  factors: {
    responseTime: number;
    connectionStability: number;
    audioClarity?: number;
    videoClarity?: number;
    userSatisfaction?: number;
  };
  recommendations: string[];
}

class ConversationAnalytics {
  private activeMetrics: Map<string, ConversationMetrics> = new Map();
  private completedSessions: ConversationMetrics[] = [];
  private qualityThresholds = {
    responseTime: {
      excellent: 1000,
      good: 2000,
      fair: 5000
    },
    engagement: {
      high: 0.8,
      medium: 0.5,
      low: 0.2
    }
  };

  /**
   * Start tracking a new conversation session
   */
  startSession(sessionId: string, mode: ConversationMetrics['mode']): void {
    const metrics: ConversationMetrics = {
      sessionId,
      startTime: new Date(),
      mode,
      totalMessages: 0,
      userMessages: 0,
      agentMessages: 0,
      averageMessageLength: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimeVariance: 0,
      connectionQuality: 'good',
      userEngagementScore: 0.5,
      errors: []
    };

    if (mode === 'multimodal') {
      metrics.modeChanges = 0;
      metrics.modeDistribution = {
        text: 0,
        voice: 0,
        video: 0
      };
    }

    this.activeMetrics.set(sessionId, metrics);
  }

  /**
   * Record a message exchange
   */
  recordMessage(
    sessionId: string,
    type: 'user' | 'agent',
    messageLength: number,
    responseTime?: number
  ): void {
    const metrics = this.activeMetrics.get(sessionId);
    if (!metrics) return;

    metrics.totalMessages++;
    
    if (type === 'user') {
      metrics.userMessages++;
    } else {
      metrics.agentMessages++;
      
      if (responseTime !== undefined) {
        // Update response time metrics
        const totalResponseTime = metrics.averageResponseTime * (metrics.agentMessages - 1) + responseTime;
        metrics.averageResponseTime = totalResponseTime / metrics.agentMessages;
        metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
        metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
        
        // Calculate variance
        this.updateResponseTimeVariance(metrics, responseTime);
        
        // Update connection quality based on response time
        this.updateConnectionQuality(metrics);
      }
    }

    // Update average message length
    const totalLength = metrics.averageMessageLength * (metrics.totalMessages - 1) + messageLength;
    metrics.averageMessageLength = totalLength / metrics.totalMessages;

    // Update engagement score
    this.updateEngagementScore(metrics);
  }

  /**
   * Record mode change (for multimodal conversations)
   */
  recordModeChange(sessionId: string, fromMode: string, toMode: string): void {
    const metrics = this.activeMetrics.get(sessionId);
    if (!metrics || !metrics.modeChanges || !metrics.modeDistribution) return;

    metrics.modeChanges++;
    metrics.modeDistribution[toMode] = (metrics.modeDistribution[toMode] || 0) + 1;
  }

  /**
   * Record an error
   */
  recordError(
    sessionId: string,
    type: string,
    message: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    const metrics = this.activeMetrics.get(sessionId);
    if (!metrics) return;

    metrics.errors.push({
      timestamp: new Date(),
      type,
      message,
      severity
    });

    // Adjust quality based on error severity
    if (severity === 'high') {
      this.degradeConnectionQuality(metrics);
    }
  }

  /**
   * Update quality metrics
   */
  updateQualityMetrics(
    sessionId: string,
    updates: {
      audioQuality?: number;
      videoQuality?: number;
      networkLatency?: number;
      memoryUsage?: number;
      cpuUsage?: number;
    }
  ): void {
    const metrics = this.activeMetrics.get(sessionId);
    if (!metrics) return;

    Object.assign(metrics, updates);
    this.updateConnectionQuality(metrics);
  }

  /**
   * Record user satisfaction
   */
  recordSatisfaction(sessionId: string, rating: number): void {
    const metrics = this.activeMetrics.get(sessionId);
    if (!metrics) return;

    metrics.conversationSatisfaction = Math.max(1, Math.min(5, rating));
    this.updateEngagementScore(metrics);
  }

  /**
   * End session tracking
   */
  endSession(sessionId: string): ConversationMetrics | null {
    const metrics = this.activeMetrics.get(sessionId);
    if (!metrics) return null;

    metrics.endTime = new Date();
    
    // Fix infinite min response time
    if (metrics.minResponseTime === Infinity) {
      metrics.minResponseTime = 0;
    }

    // Store completed session
    this.completedSessions.push({ ...metrics });
    this.activeMetrics.delete(sessionId);

    return metrics;
  }

  /**
   * Get current session metrics
   */
  getSessionMetrics(sessionId: string): ConversationMetrics | null {
    return this.activeMetrics.get(sessionId) || null;
  }

  /**
   * Assess conversation quality
   */
  assessQuality(sessionId: string): QualityAssessment | null {
    const metrics = this.activeMetrics.get(sessionId) || 
                   this.completedSessions.find(s => s.sessionId === sessionId);
    
    if (!metrics) return null;

    const factors = {
      responseTime: this.assessResponseTime(metrics.averageResponseTime),
      connectionStability: this.assessConnectionStability(metrics),
      audioClarity: metrics.audioQuality,
      videoClarity: metrics.videoQuality,
      userSatisfaction: metrics.conversationSatisfaction ? metrics.conversationSatisfaction / 5 : undefined
    };

    // Calculate overall quality
    const weights = {
      responseTime: 0.3,
      connectionStability: 0.2,
      audioClarity: 0.2,
      videoClarity: 0.2,
      userSatisfaction: 0.1
    };

    let overall = 0;
    let totalWeight = 0;

    Object.entries(factors).forEach(([key, value]) => {
      if (value !== undefined) {
        overall += value * weights[key as keyof typeof weights];
        totalWeight += weights[key as keyof typeof weights];
      }
    });

    overall = totalWeight > 0 ? overall / totalWeight : 0.5;

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, factors);

    return {
      overall,
      factors,
      recommendations
    };
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): {
    totalSessions: number;
    averageSessionDuration: number;
    averageQuality: number;
    mostCommonIssues: Array<{ type: string; count: number }>;
    modePreferences?: Record<string, number>;
  } {
    const allSessions = [...this.completedSessions, ...Array.from(this.activeMetrics.values())];
    
    if (allSessions.length === 0) {
      return {
        totalSessions: 0,
        averageSessionDuration: 0,
        averageQuality: 0,
        mostCommonIssues: []
      };
    }

    // Calculate average session duration
    const completedSessions = allSessions.filter(s => s.endTime);
    const averageSessionDuration = completedSessions.length > 0 
      ? completedSessions.reduce((sum, s) => sum + (s.endTime!.getTime() - s.startTime.getTime()), 0) / completedSessions.length
      : 0;

    // Calculate average quality
    const qualityScores = allSessions.map(s => this.assessQuality(s.sessionId)?.overall || 0.5);
    const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

    // Find most common issues
    const errorCounts: Record<string, number> = {};
    allSessions.forEach(session => {
      session.errors.forEach(error => {
        errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
      });
    });

    const mostCommonIssues = Object.entries(errorCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate mode preferences for multimodal sessions
    const multimodalSessions = allSessions.filter(s => s.mode === 'multimodal' && s.modeDistribution);
    let modePreferences: Record<string, number> | undefined;
    
    if (multimodalSessions.length > 0) {
      modePreferences = { text: 0, voice: 0, video: 0 };
      multimodalSessions.forEach(session => {
        if (session.modeDistribution) {
          Object.entries(session.modeDistribution).forEach(([mode, count]) => {
            modePreferences![mode] += count;
          });
        }
      });
    }

    return {
      totalSessions: allSessions.length,
      averageSessionDuration,
      averageQuality,
      mostCommonIssues,
      modePreferences
    };
  }

  /**
   * Export analytics data
   */
  exportData(): {
    activeSessions: ConversationMetrics[];
    completedSessions: ConversationMetrics[];
    summary: ReturnType<typeof this.getAnalyticsSummary>;
  } {
    return {
      activeSessions: Array.from(this.activeMetrics.values()),
      completedSessions: this.completedSessions,
      summary: this.getAnalyticsSummary()
    };
  }

  // Private helper methods

  private updateResponseTimeVariance(metrics: ConversationMetrics, newResponseTime: number): void {
    // Simplified variance calculation
    const diff = newResponseTime - metrics.averageResponseTime;
    metrics.responseTimeVariance = (metrics.responseTimeVariance * (metrics.agentMessages - 1) + diff * diff) / metrics.agentMessages;
  }

  private updateConnectionQuality(metrics: ConversationMetrics): void {
    const { responseTime } = this.qualityThresholds;
    
    if (metrics.averageResponseTime <= responseTime.excellent) {
      metrics.connectionQuality = 'excellent';
    } else if (metrics.averageResponseTime <= responseTime.good) {
      metrics.connectionQuality = 'good';
    } else if (metrics.averageResponseTime <= responseTime.fair) {
      metrics.connectionQuality = 'fair';
    } else {
      metrics.connectionQuality = 'poor';
    }
  }

  private degradeConnectionQuality(metrics: ConversationMetrics): void {
    const qualityLevels = ['excellent', 'good', 'fair', 'poor'];
    const currentIndex = qualityLevels.indexOf(metrics.connectionQuality);
    if (currentIndex < qualityLevels.length - 1) {
      metrics.connectionQuality = qualityLevels[currentIndex + 1] as any;
    }
  }

  private updateEngagementScore(metrics: ConversationMetrics): void {
    let score = 0.5; // Base score

    // Factor in message frequency
    const sessionDuration = Date.now() - metrics.startTime.getTime();
    const messagesPerMinute = (metrics.totalMessages / sessionDuration) * 60000;
    
    if (messagesPerMinute > 2) score += 0.2;
    else if (messagesPerMinute > 1) score += 0.1;
    else if (messagesPerMinute < 0.5) score -= 0.2;

    // Factor in message length (longer messages = higher engagement)
    if (metrics.averageMessageLength > 100) score += 0.1;
    else if (metrics.averageMessageLength < 20) score -= 0.1;

    // Factor in satisfaction rating
    if (metrics.conversationSatisfaction) {
      score += (metrics.conversationSatisfaction - 3) * 0.1; // Scale from -0.2 to +0.2
    }

    // Factor in errors (reduce engagement for errors)
    const highSeverityErrors = metrics.errors.filter(e => e.severity === 'high').length;
    score -= highSeverityErrors * 0.1;

    metrics.userEngagementScore = Math.max(0, Math.min(1, score));
  }

  private assessResponseTime(avgResponseTime: number): number {
    const { responseTime } = this.qualityThresholds;
    
    if (avgResponseTime <= responseTime.excellent) return 1.0;
    if (avgResponseTime <= responseTime.good) return 0.8;
    if (avgResponseTime <= responseTime.fair) return 0.6;
    return 0.3;
  }

  private assessConnectionStability(metrics: ConversationMetrics): number {
    const errorRate = metrics.errors.length / Math.max(1, metrics.totalMessages);
    const highSeverityErrors = metrics.errors.filter(e => e.severity === 'high').length;
    
    let stability = 1.0;
    stability -= errorRate * 0.5;
    stability -= highSeverityErrors * 0.2;
    
    return Math.max(0, stability);
  }

  private generateRecommendations(metrics: ConversationMetrics, factors: QualityAssessment['factors']): string[] {
    const recommendations: string[] = [];

    if (factors.responseTime < 0.7) {
      recommendations.push('Consider optimizing AI response generation for faster replies');
    }

    if (factors.connectionStability < 0.8) {
      recommendations.push('Check network connection stability and reduce error rates');
    }

    if (factors.audioClarity && factors.audioClarity < 0.7) {
      recommendations.push('Improve audio quality settings or check microphone configuration');
    }

    if (factors.videoClarity && factors.videoClarity < 0.7) {
      recommendations.push('Optimize video quality settings or improve lighting conditions');
    }

    if (metrics.userEngagementScore < this.qualityThresholds.engagement.medium) {
      recommendations.push('Consider adjusting conversation style to increase user engagement');
    }

    if (metrics.errors.length > 5) {
      recommendations.push('Address recurring technical issues to improve user experience');
    }

    if (metrics.mode === 'multimodal' && metrics.modeChanges && metrics.modeChanges > 10) {
      recommendations.push('Frequent mode switching detected - consider optimizing mode selection logic');
    }

    return recommendations;
  }
}

// Export singleton instance
export const conversationAnalytics = new ConversationAnalytics();
export default conversationAnalytics;

// Export types
export type { ConversationMetrics, QualityAssessment };