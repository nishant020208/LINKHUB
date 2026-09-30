import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * HTML5 drag-to-reorder wrapper for dashboard widgets.
 * On drop, calls onReorder(fromId, toId) so the parent can persist the
 * new order (user_settings.widget_order).
 */
export const SortableWidget: React.FC<{
  id: string;
  onReorder: (fromId: string, toId: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ id, onReorder, children, className }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const dragCounter = useRef(0);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/widget-id', id);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragEnter={(e) => {
        e.preventDefault();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('text/widget-id')) setIsOver(true);
      }}
      onDragLeave={() => {
        dragCounter.current--;
        if (dragCounter.current === 0) setIsOver(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragCounter.current = 0;
        setIsOver(false);
        const fromId = e.dataTransfer.getData('text/widget-id');
        if (fromId && fromId !== id) onReorder(fromId, id);
      }}
      className={cn(
        'transition-opacity',
        isDragging && 'opacity-40',
        isOver && 'ring-2 ring-primary/50 rounded-3xl',
        className
      )}
    >
      {children}
    </div>
  );
};

/** Apply a saved widget order to the canonical widget list. */
export function applyWidgetOrder<T extends { id: string }>(widgets: T[], order: string[]): T[] {
  if (!order.length) return widgets;
  const map = new Map(widgets.map((w) => [w.id, w]));
  const ordered: T[] = [];
  for (const id of order) {
    const w = map.get(id);
    if (w) {
      ordered.push(w);
      map.delete(id);
    }
  }
  return [...ordered, ...map.values()];
}
