import { supabase } from './agent-runtime';
import { conversationManager } from './conversation-manager';
import type { Conversation, Message } from './agent-runtime';

export interface VoiceMessage extends Message {
  audio_url?: string;
  audio_duration?: number;
  transcription?: string;
  voice_quality_score?: number;
  speech_confidence?: number;
}

export interface VoiceConversation extends Conversation {
  total_audio_duration: number;
  transcription_accuracy: number;
  voice_interactions_count: number;
  audio_files: VoiceAudioFile[];
}

export interface VoiceAudioFile {
  id: string;
  conversation_id: string;
  message_id: string;
  file_url: string;
  file_size: number;
  duration: number;
  format: string;
  quality_score?: number;
  created_at: string;
}

export interface VoiceAnalytics {
  total_voice_conversations: number;
  total_audio_duration: number;
  average_conversation_duration: number;
  transcription_accuracy: number;
  voice_quality_average: number;
  most_used_voices: { voice_id: string; usage_count: number }[];
  peak_usage_hours: { hour: number; conversation_count: number }[];
}

/**
 * Voice Conversation Manager
 * Handles voice-specific conversation features, audio storage, and analytics
 */
export class VoiceConversationManager {
  private readonly AUDIO_STORAGE_BUCKET = 'voice-conversations';
  private readonly MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly SUPPORTED_FORMATS = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg'];

  /**
   * Store audio file and create voice message
   */
  async createVoiceMessage(
    conversationId: string,
    role: 'user' | 'agent',
    audioBlob: Blob,
    transcription: string,
    metadata: {
      duration?: number;
      voice_id?: string;
      confidence?: number;
      quality_score?: number;
    } = {}
  ): Promise<VoiceMessage | null> {
    try {
      // Validate audio file
      if (!this.validateAudioFile(audioBlob)) {
        throw new Error('Invalid audio file format or size');
      }

      // Store audio file
      const audioFile = await this.storeAudioFile(conversationId, audioBlob, role);
      if (!audioFile) {
        throw new Error('Failed to store audio file');
      }

      // Create message with audio metadata
      const message = await conversationManager.addMessage(
        conversationId,
        role,
        transcription,
        'audio',
        {
          audio_url: audioFile.file_url,
          audio_duration: metadata.duration || audioFile.duration,
          voice_id: metadata.voice_id,
          speech_confidence: metadata.confidence,
          voice_quality_score: metadata.quality_score,
          audio_file_id: audioFile.id,
        }
      );

      if (!message) {
        throw new Error('Failed to create voice message');
      }

      // Update conversation voice statistics
      await this.updateVoiceConversationStats(conversationId, audioFile.duration);

      return {
        ...message,
        audio_url: audioFile.file_url,
        audio_duration: audioFile.duration,
        transcription,
        voice_quality_score: metadata.quality_score,
        speech_confidence: metadata.confidence,
      };
    } catch (error) {
      console.error('Error creating voice message:', error);
      return null;
    }
  }

  /**
   * Get voice conversation with audio files
   */
  async getVoiceConversation(conversationId: string): Promise<VoiceConversation | null> {
    try {
      // Get base conversation
      const conversation = await conversationManager.getConversation(conversationId);
      if (!conversation) {
        return null;
      }

      // Get audio files
      const { data: audioFiles, error } = await supabase
        .from('voice_audio_files')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching audio files:', error);
        return null;
      }

      // Calculate voice-specific metrics
      const totalAudioDuration = audioFiles?.reduce((sum, file) => sum + file.duration, 0) || 0;
      const voiceInteractionsCount = audioFiles?.length || 0;
      const transcriptionAccuracy = await this.calculateTranscriptionAccuracy(conversationId);

      return {
        ...conversation,
        total_audio_duration: totalAudioDuration,
        transcription_accuracy: transcriptionAccuracy,
        voice_interactions_count: voiceInteractionsCount,
        audio_files: audioFiles || [],
      };
    } catch (error) {
      console.error('Error getting voice conversation:', error);
      return null;
    }
  }

  /**
   * Get voice messages for a conversation
   */
  async getVoiceMessages(conversationId: string): Promise<VoiceMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          voice_audio_files (
            id,
            file_url,
            duration,
            quality_score
          )
        `)
        .eq('conversation_id', conversationId)
        .eq('type', 'audio')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching voice messages:', error);
        return [];
      }

      return (messages || []).map(msg => ({
        ...msg,
        audio_url: msg.voice_audio_files?.[0]?.file_url,
        audio_duration: msg.voice_audio_files?.[0]?.duration,
        transcription: msg.content,
        voice_quality_score: msg.voice_audio_files?.[0]?.quality_score,
        speech_confidence: msg.metadata?.speech_confidence,
      }));
    } catch (error) {
      console.error('Error getting voice messages:', error);
      return [];
    }
  }

  /**
   * Store audio file in Supabase Storage
   */
  private async storeAudioFile(
    conversationId: string,
    audioBlob: Blob,
    role: 'user' | 'agent'
  ): Promise<VoiceAudioFile | null> {
    try {
      const fileId = `${conversationId}_${role}_${Date.now()}.webm`;
      const filePath = `${conversationId}/${fileId}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.AUDIO_STORAGE_BUCKET)
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading audio file:', uploadError);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.AUDIO_STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Get audio duration
      const duration = await this.getAudioDuration(audioBlob);

      // Create audio file record
      const { data: audioFile, error: dbError } = await supabase
        .from('voice_audio_files')
        .insert({
          conversation_id: conversationId,
          file_url: urlData.publicUrl,
          file_path: filePath,
          file_size: audioBlob.size,
          duration: duration,
          format: audioBlob.type,
          role: role,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error creating audio file record:', dbError);
        // Clean up uploaded file
        await supabase.storage
          .from(this.AUDIO_STORAGE_BUCKET)
          .remove([filePath]);
        return null;
      }

      return audioFile;
    } catch (error) {
      console.error('Error storing audio file:', error);
      return null;
    }
  }

  /**
   * Get audio duration from blob
   */
  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration || 0);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };

      audio.src = url;
    });
  }

  /**
   * Validate audio file
   */
  private validateAudioFile(audioBlob: Blob): boolean {
    // Check file size
    if (audioBlob.size > this.MAX_AUDIO_FILE_SIZE) {
      console.error('Audio file too large:', audioBlob.size);
      return false;
    }

    // Check format
    if (!this.SUPPORTED_FORMATS.includes(audioBlob.type)) {
      console.error('Unsupported audio format:', audioBlob.type);
      return false;
    }

    return true;
  }

  /**
   * Update voice conversation statistics
   */
  private async updateVoiceConversationStats(conversationId: string, audioDuration: number): Promise<void> {
    try {
      // Update conversation metadata
      const { data: conversation } = await supabase
        .from('conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();

      if (conversation) {
        const currentMetadata = conversation.metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          total_audio_duration: (currentMetadata.total_audio_duration || 0) + audioDuration,
          voice_interactions_count: (currentMetadata.voice_interactions_count || 0) + 1,
          last_voice_interaction: new Date().toISOString(),
        };

        await supabase
          .from('conversations')
          .update({ metadata: updatedMetadata })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error updating voice conversation stats:', error);
    }
  }

  /**
   * Calculate transcription accuracy (simplified)
   */
  private async calculateTranscriptionAccuracy(conversationId: string): Promise<number> {
    try {
      // This is a simplified calculation
      // In production, you might compare transcriptions with manual corrections
      const { data: messages } = await supabase
        .from('messages')
        .select('metadata')
        .eq('conversation_id', conversationId)
        .eq('type', 'audio');

      if (!messages || messages.length === 0) {
        return 0;
      }

      const confidenceScores = messages
        .map(msg => msg.metadata?.speech_confidence)
        .filter(score => typeof score === 'number');

      if (confidenceScores.length === 0) {
        return 0.8; // Default assumption
      }

      return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    } catch (error) {
      console.error('Error calculating transcription accuracy:', error);
      return 0;
    }
  }

  /**
   * Get voice analytics
   */
  async getVoiceAnalytics(
    agentId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<VoiceAnalytics> {
    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          messages!inner (
            id,
            type,
            metadata,
            created_at
          )
        `)
        .eq('messages.type', 'audio');

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data: conversations, error } = await query;

      if (error) {
        console.error('Error fetching voice analytics:', error);
        return this.getEmptyVoiceAnalytics();
      }

      // Calculate analytics
      const totalVoiceConversations = conversations?.length || 0;
      const totalAudioDuration = conversations?.reduce((sum, conv) => {
        return sum + (conv.metadata?.total_audio_duration || 0);
      }, 0) || 0;

      const averageConversationDuration = totalVoiceConversations > 0 
        ? totalAudioDuration / totalVoiceConversations 
        : 0;

      // Calculate transcription accuracy
      const transcriptionAccuracies = conversations?.map(conv => 
        conv.metadata?.transcription_accuracy || 0.8
      ) || [];
      const transcriptionAccuracy = transcriptionAccuracies.length > 0
        ? transcriptionAccuracies.reduce((sum, acc) => sum + acc, 0) / transcriptionAccuracies.length
        : 0;

      // Get voice usage statistics
      const voiceUsage = await this.getVoiceUsageStats(agentId, dateFrom, dateTo);
      const peakUsageHours = await this.getPeakUsageHours(agentId, dateFrom, dateTo);

      return {
        total_voice_conversations: totalVoiceConversations,
        total_audio_duration: totalAudioDuration,
        average_conversation_duration: averageConversationDuration,
        transcription_accuracy: transcriptionAccuracy,
        voice_quality_average: 0.85, // Placeholder
        most_used_voices: voiceUsage,
        peak_usage_hours: peakUsageHours,
      };
    } catch (error) {
      console.error('Error getting voice analytics:', error);
      return this.getEmptyVoiceAnalytics();
    }
  }

  /**
   * Get voice usage statistics
   */
  private async getVoiceUsageStats(
    agentId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ voice_id: string; usage_count: number }[]> {
    try {
      let query = supabase
        .from('messages')
        .select('metadata')
        .eq('type', 'audio')
        .eq('role', 'agent');

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      const { data: messages } = await query;

      if (!messages) return [];

      // Count voice usage
      const voiceUsage: Record<string, number> = {};
      messages.forEach(msg => {
        const voiceId = msg.metadata?.voice_id || 'unknown';
        voiceUsage[voiceId] = (voiceUsage[voiceId] || 0) + 1;
      });

      return Object.entries(voiceUsage)
        .map(([voice_id, usage_count]) => ({ voice_id, usage_count }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting voice usage stats:', error);
      return [];
    }
  }

  /**
   * Get peak usage hours
   */
  private async getPeakUsageHours(
    agentId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ hour: number; conversation_count: number }[]> {
    try {
      let query = supabase
        .from('conversations')
        .select('created_at')
        .contains('metadata', { voice_interactions_count: 1 });

      if (agentId) query = query.eq('agent_id', agentId);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      const { data: conversations } = await query;

      if (!conversations) return [];

      // Count conversations by hour
      const hourlyUsage: Record<number, number> = {};
      conversations.forEach(conv => {
        const hour = new Date(conv.created_at).getHours();
        hourlyUsage[hour] = (hourlyUsage[hour] || 0) + 1;
      });

      return Object.entries(hourlyUsage)
        .map(([hour, conversation_count]) => ({ 
          hour: parseInt(hour), 
          conversation_count 
        }))
        .sort((a, b) => b.conversation_count - a.conversation_count);
    } catch (error) {
      console.error('Error getting peak usage hours:', error);
      return [];
    }
  }

  /**
   * Delete audio file
   */
  async deleteAudioFile(audioFileId: string): Promise<boolean> {
    try {
      // Get audio file record
      const { data: audioFile, error: fetchError } = await supabase
        .from('voice_audio_files')
        .select('file_path')
        .eq('id', audioFileId)
        .single();

      if (fetchError || !audioFile) {
        console.error('Audio file not found:', fetchError);
        return false;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.AUDIO_STORAGE_BUCKET)
        .remove([audioFile.file_path]);

      if (storageError) {
        console.error('Error deleting audio file from storage:', storageError);
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('voice_audio_files')
        .delete()
        .eq('id', audioFileId);

      if (dbError) {
        console.error('Error deleting audio file record:', dbError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return false;
    }
  }

  /**
   * Clean up old audio files
   */
  async cleanupOldAudioFiles(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data: oldFiles, error } = await supabase
        .from('voice_audio_files')
        .select('id, file_path')
        .lt('created_at', cutoffDate.toISOString());

      if (error || !oldFiles) {
        console.error('Error fetching old audio files:', error);
        return 0;
      }

      let deletedCount = 0;
      for (const file of oldFiles) {
        const deleted = await this.deleteAudioFile(file.id);
        if (deleted) deletedCount++;
      }

      console.log(`Cleaned up ${deletedCount} old audio files`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old audio files:', error);
      return 0;
    }
  }

  /**
   * Get empty voice analytics
   */
  private getEmptyVoiceAnalytics(): VoiceAnalytics {
    return {
      total_voice_conversations: 0,
      total_audio_duration: 0,
      average_conversation_duration: 0,
      transcription_accuracy: 0,
      voice_quality_average: 0,
      most_used_voices: [],
      peak_usage_hours: [],
    };
  }
}

// Create singleton instance
export const voiceConversationManager = new VoiceConversationManager();