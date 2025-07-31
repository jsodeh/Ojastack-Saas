import React from 'react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import VideoTestingDashboard from '../../components/VideoTestingDashboard';

const VideoTest: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Conversation Testing</h1>
          <p className="mt-2 text-gray-600">
            Test and configure video conversations with AI agents using LiveKit, ElevenLabs, and enhanced AI services.
          </p>
        </div>
        
        <VideoTestingDashboard />
      </div>
    </DashboardLayout>
  );
};

export default VideoTest;