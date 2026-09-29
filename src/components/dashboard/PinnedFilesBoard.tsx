import React from 'react';
import { FileText, ExternalLink, Pin, HardDrive } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export const PinnedFilesBoard: React.FC = () => {
  const { items, accounts } = useAppStore();

  const files = items.filter((item) => item.type === 'file');

  return (
    <div className="rounded-2xl glass-panel border border-border/60 p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Pinned & Course Files</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quick-access syllabi, lecture notes, and active project docs
          </p>
        </div>
        <span className="p-1.5 rounded-lg bg-muted text-muted-foreground">
          <Pin className="w-3.5 h-3.5 text-primary" />
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map((file) => {
          const account = accounts.find((a) => a.id === file.account_id);
          const fileType = file.metadata?.file_type || 'FILE';

          return (
            <a
              key={file.id}
              href={file.url || '#'}
              target="_blank"
              rel="noreferrer"
              className="p-3.5 rounded-xl bg-card/40 border border-border/40 hover:border-sky-500/40 hover:bg-card/70 transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {fileType}
                  </span>

                  {account && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: account.color }}
                      title={account.label}
                    />
                  )}
                </div>

                <h4 className="font-medium text-xs text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {file.title}
                </h4>

                {file.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {file.description}
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>{file.metadata?.file_size_formatted || 'Cloud doc'}</span>
                <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                  Open <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
