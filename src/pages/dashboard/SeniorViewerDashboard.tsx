import React from 'react';
import { Profile } from '../../types';
import PlanViewer from '../../components/dashboard/PlanViewer';

interface SeniorViewerDashboardProps {
  profile: Profile;
}

export default function SeniorViewerDashboard({ profile }: SeniorViewerDashboardProps) {
  return (
    <PlanViewer
      viewerProfile={profile}
      viewerRole={profile.role}
    />
  );
}
