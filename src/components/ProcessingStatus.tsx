import React from 'react';
import type { ProcessStatus } from '../lib/processor';

interface ProcessingStatusProps {
  status: ProcessStatus;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ status }) => {
  if (status.step === 'idle') return null;

  return (
    <div className="w-full mt-6 space-y-2">
      <div className="flex justify-between text-sm font-medium text-slate-700">
        <span>Status</span>
        <span>{status.message}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 animate-pulse"
            style={{ width: status.step === 'done' ? '100%' : '50%' }} // Simple indeterminate or step based width
        ></div>
      </div>
    </div>
  );
};
