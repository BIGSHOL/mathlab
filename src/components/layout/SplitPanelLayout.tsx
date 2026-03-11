'use client';

import { useState, type ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SplitPanelLayoutProps {
  /** Panel header icon */
  icon: ReactNode;
  /** Panel title */
  title: string;
  /** Badge count next to title */
  count?: number;
  /** Content below header (action buttons, search, filters, etc.) */
  panelTop?: ReactNode;
  /** Main scrollable list content */
  panelList: ReactNode;
  /** Bottom of panel (pagination etc.) */
  panelBottom?: ReactNode;
  /** Right side content (detail view) */
  children: ReactNode;
  /** Icon shown when panel is collapsed */
  collapsedIcon?: ReactNode;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

export function SplitPanelLayout({
  icon,
  title,
  count,
  panelTop,
  panelList,
  panelBottom,
  children,
  collapsedIcon,
  defaultCollapsed = false,
}: SplitPanelLayoutProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* Left Panel */}
      <aside
        className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${
          collapsed ? 'w-12' : 'w-72'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-primary shrink-0">{icon}</span>
                <h1 className="text-sm font-bold text-text-primary truncate">{title}</h1>
                {count !== undefined && (
                  <span className="text-[10px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-sm font-medium shrink-0">
                    {count.toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setCollapsed((p) => !p)}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              title={collapsed ? '패널 펼치기' : '패널 접기'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Panel content (hidden when collapsed) */}
        {!collapsed && (
          <>
            {panelTop && <div className="shrink-0">{panelTop}</div>}
            <div className="flex-1 overflow-y-auto">{panelList}</div>
            {panelBottom && <div className="shrink-0">{panelBottom}</div>}
          </>
        )}

        {/* Collapsed state */}
        {collapsed && (
          <div className="flex-1 flex flex-col items-center pt-3 gap-2">
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors"
              title={`${title} 열기`}
            >
              {collapsedIcon ?? icon}
            </button>
          </div>
        )}
      </aside>

      {/* Right Main */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {children}
      </main>
    </div>
  );
}

/** Reusable placeholder for when no item is selected in the right panel */
export function SplitPanelPlaceholder({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex-1 flex items-center justify-center text-text-secondary">
      <div className="text-center">
        <span className="block mx-auto mb-3 opacity-15">{icon}</span>
        <p className="font-medium text-text-primary">{title}</p>
        {description && <p className="text-sm mt-1">{description}</p>}
      </div>
    </div>
  );
}

/** Reusable list item for the left panel */
export function SplitPanelListItem({
  isSelected,
  onClick,
  children,
  actions,
}: {
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className={`group flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/5 border-l-2 border-l-primary'
          : 'hover:bg-white border-l-2 border-l-transparent'
      }`}
    >
      <button className="flex-1 min-w-0 text-left" onClick={onClick}>
        {children}
      </button>
      {actions && (
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-all">
          {actions}
        </div>
      )}
    </div>
  );
}
