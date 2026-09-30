import React from 'react';
import { ExternalLink, FolderOpen } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCounter } from '@/components/ui/metric-counter';

export const PinnedFilesBoard: React.FC = () => {
  const { items, accounts } = useAppStore();

  const files = items.filter((item) => item.type === 'file');

  const fileProviders = Array.from(
    new Set(
      accounts.map((a) => {
        if (a.provider === 'google') return 'Google Drive & Classroom';
        if (a.provider === 'dropbox') return 'Dropbox';
        if (a.provider === 'box') return 'Box';
        return a.label || a.provider;
      })
    )
  );

  const subtitleText =
    fileProviders.length > 0
      ? `Quick-access syllabi and starred files from ${fileProviders.join(', ')}`
      : 'Connect Google Drive or cloud storage to access files directly';

  return (
    <Card variant="bento" className="space-y-4">
      <CardHeader>
        <div>
          <CardTitle>Pinned &amp; Course Files</CardTitle>
          <CardDescription>
            {subtitleText}
          </CardDescription>
        </div>
        <Badge tone="accent">
          <MetricCounter value={files.length} /> files
        </Badge>
      </CardHeader>

      <CardBody className="pt-0">
        {files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((file) => {
              const account = accounts.find((a) => a.id === file.account_id);
              const fileType = file.metadata?.file_type || 'DOC';

              return (
                <a
                  key={file.id}
                  href={file.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-2xl bg-card/60 border border-border/50 hover:border-primary/50 hover:bg-card/90 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
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

                    <h5 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {file.title}
                    </h5>

                    {file.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {file.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>{file.metadata?.file_size_formatted || 'Cloud doc'}</span>
                    <span className="flex items-center gap-1 group-hover:text-foreground">
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs font-mono space-y-2 border border-dashed border-border/60 rounded-2xl p-6">
            <FolderOpen className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-foreground font-semibold">No pinned documents</p>
            <p className="text-[11px] text-muted-foreground">
              Syllabi, Drive docs, and attachments will show up here for fast access.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
