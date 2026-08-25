import React from 'react';
import { EmptyState } from '../components/common';
import { FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <EmptyState
        icon={<FileQuestion size={48} />}
        title="404 — Page Not Found"
        description="The requested route does not exist in the DEVOS workspace."
        actionLabel="Return to Dashboard"
        onAction={() => navigate('/dashboard')}
      />
    </div>
  );
};
