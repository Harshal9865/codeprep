import React from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC<{ onGoHome?: () => void }> = ({ onGoHome }) => {
  return (
    <AppLayout showFooter={true}>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-surface-elevated border border-border-default flex items-center justify-center text-text-muted">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="font-headline font-bold text-3xl text-text-primary tracking-tight">
            404 • Resource Not Found
          </h1>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            The requested problem ID, submission, or curriculum route does not exist in this private instance.
          </p>
        </div>
        <div className="pt-2">
          <Button
            variant="secondary"
            size="md"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => onGoHome ? onGoHome() : (window.location.href = '/')}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

