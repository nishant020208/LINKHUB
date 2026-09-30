import React from 'react';
import { FileText, ExternalLink, FolderOpen } from 'lucide-react';
import { useSyncData } from '@/hooks/useSyncData';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { GridSkeleton } from '@/components/ui/skeleton';

/**
 * Files — every pinned / recently-synced cloud document across accounts.
 */
export const FilesPage: React.FC = () => {
  const { isLoading } = useSyncData();
  const { items, accounts } = useAppStore();

  const files = items
    .filter((i) => i.type === 'file')
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="font-display font-bold text-2xl">Files</h2>
        <GridSkeleton cards={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border/40">
        <h2 className="font-display font-bold text-2xl">Files</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {files.length} pinned and recently active document{files.length === 1 ? '' : 's'} across your accounts
        </p>
      </div>

      {files.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<FolderOpen className="w-5 h-5" />}
              title="No files yet"
              description={
                accounts.length === 0
                  ? 'Connect Google Drive or OneDrive to surface your pinned research papers and project docs.'
                  : 'Your connected drives have no starred or recently modified files in the sync window.'
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => {
            const account = accounts.find((a) => a.id === file.account_id);
            return (
              <Card key={file.id} interactive delay={0}>
                <CardHeader>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <span className="truncate text-sm font-medium">{file.title}</span>
                  </div>
                  {file.metadata?.file_type ? (
                    <Badge tone="accent">{String(file.metadata.file_type)}</Badge>
                  ) : null}
                </CardHeader>
                <CardBody className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground truncate">
                    {account?.label ?? file.metadata?.file_size_formatted ?? 'Cloud file'}
                  </span>
                  {file.url && (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Open file"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
