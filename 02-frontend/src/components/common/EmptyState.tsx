import React from 'react';
import { FolderGit2 } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  headingLevel?: 'h1' | 'h2' | 'h3';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <FolderGit2 size={36} />,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  headingLevel = 'h3',
}) => {
  const Heading = headingLevel;
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <Heading className="empty-state-title">{title}</Heading>
      <p className="empty-state-description">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {secondaryActionLabel && onSecondaryAction && (
        <Button variant="ghost" onClick={onSecondaryAction}>{secondaryActionLabel}</Button>
      )}
    </div>
  );
};
