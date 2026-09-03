import React from 'react';
import { Profile } from '../../types';
import PlanViewer from '../../components/dashboard/PlanViewer';

interface ManagerDashboardProps {
  profile: Profile;
}

export default function ManagerDashboard({ profile }: ManagerDashboardProps) {
  return (
    <PlanViewer
      viewerProfile={profile}
      viewerRole={profile.role}
      filterDepartment={profile.department || undefined}
    />
  );
}
