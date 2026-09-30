import React from 'react';
import { createPortal } from 'react-dom';
import { X, Award, FileSpreadsheet, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { exportToCSV, exportToICal } from '@/lib/export';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({ isOpen, onClose }) => {
  const { items } = useAppStore();

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const deadlines = (items || []).filter((i) => i.type === 'deadline' || i.type === 'task');
  const completed = deadlines.filter((d) => d.is_done);
  const now = new Date();
  const missed = deadlines.filter((d) => !d.is_done && d.due_at && new Date(d.due_at) < now);

  const total = deadlines.length;
  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border/70 rounded-3xl max-w-lg w-full p-4 sm:p-6 md:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground">Weekly Performance Report</h3>
              <p className="text-[11px] font-mono text-muted-foreground">Coursework & Deadline Velocity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-card/40 border border-border/50 text-center">
            <div className="font-heading font-black text-2xl text-status-connected">
              {completed.length}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">Completed</div>
          </div>

          <div className="p-4 rounded-2xl bg-card/40 border border-border/50 text-center">
            <div className="font-heading font-black text-2xl text-status-error">
              {missed.length}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">Overdue/Missed</div>
          </div>

          <div className="p-4 rounded-2xl bg-card/40 border border-border/50 text-center">
            <div className="font-heading font-black text-2xl text-primary">
              {completionRate}%
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">Completion Rate</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span>Overall Pace</span>
            <span>{completed.length} of {total} items</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Export triggers */}
        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="text-xs font-mono text-muted-foreground">Export Data for External Planners:</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToICal(items)}
              className="flex-1 py-2 px-3 rounded-xl bg-card border border-border hover:bg-card/80 text-foreground text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Export to iCal (.ics)</span>
            </button>

            <button
              onClick={() => exportToCSV(items)}
              className="flex-1 py-2 px-3 rounded-xl bg-card border border-border hover:bg-card/80 text-foreground text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-status-connected" />
              <span>Export to CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
