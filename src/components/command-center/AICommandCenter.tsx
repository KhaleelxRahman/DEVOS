import React from 'react';
import { AIAppFactoryDashboard } from '../factory/AIAppFactoryDashboard';

interface AICommandCenterProps {
  onScaffoldComplete?: () => void;
}

export const AICommandCenter: React.FC<AICommandCenterProps> = ({ onScaffoldComplete }) => {
  return <AIAppFactoryDashboard onPlanComplete={onScaffoldComplete} />;
};

