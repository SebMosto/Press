import React from 'react';
import { formatBytes, cn } from '../lib/utils';

interface StatsPanelProps {
  originalSize: number;
  newSize?: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ originalSize, newSize }) => {
  const percentSaved = newSize ? Math.round(((originalSize - newSize) / originalSize) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
        <div className="text-xs font-semibold text-slate-500 uppercase">Original Size</div>
        <div className="text-2xl font-bold text-slate-800">{formatBytes(originalSize)}</div>
      </div>

      {newSize && (
        <div className={cn(
            "p-4 rounded-lg border",
            newSize > 4 * 1024 * 1024
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
        )}>
           <div className={cn(
               "text-xs font-semibold uppercase",
               newSize > 4 * 1024 * 1024 ? "text-yellow-600" : "text-green-600"
           )}>New Size</div>

           <div className="flex flex-col">
               <div className="flex items-baseline gap-2">
                <div className={cn(
                    "text-2xl font-bold",
                    newSize > 4 * 1024 * 1024 ? "text-yellow-800" : "text-green-800"
                )}>{formatBytes(newSize)}</div>
                <div className={cn(
                    "text-sm font-medium",
                    newSize > 4 * 1024 * 1024 ? "text-yellow-600" : "text-green-600"
                )}>({percentSaved > 0 ? '-' : '+'}{Math.abs(percentSaved)}%)</div>
               </div>

               {newSize > 4 * 1024 * 1024 && (
                   <div className="text-xs text-yellow-700 mt-1 font-medium">
                       Result is {formatBytes(newSize)}. Limit is 4MB. Try cropping the image first.
                   </div>
               )}
           </div>
        </div>
      )}
    </div>
  );
};
