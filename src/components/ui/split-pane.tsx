"use client";

import * as React from "react";
import { GripVerticalIcon, GripHorizontalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";
import type { ImperativePanelHandle } from "react-resizable-panels";

import { cn } from "./utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/**
 * Split-pane primitives satisfying the universemaster v0.45 rule: every divider between
 * adjacent panes is draggable (resize) and clickable (collapse/expand), explains itself
 * on hover (tooltip + shortcut, contrast >=4.5:1), and the layout is remembered per
 * user/view (react-resizable-panels' autoSaveId persists to localStorage).
 */

const SplitPaneGroup = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.PanelGroup>,
  React.ComponentProps<typeof ResizablePrimitive.PanelGroup> & { storageKey: string }
>(({ className, storageKey, ...props }, ref) => (
  <ResizablePrimitive.PanelGroup
    ref={ref}
    autoSaveId={storageKey}
    data-slot="split-pane-group"
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className,
    )}
    {...props}
  />
));
SplitPaneGroup.displayName = "SplitPaneGroup";

const SplitPane = React.forwardRef<ImperativePanelHandle, React.ComponentProps<typeof ResizablePrimitive.Panel>>(
  ({ ...props }, ref) => <ResizablePrimitive.Panel ref={ref} data-slot="split-pane" {...props} />,
);
SplitPane.displayName = "SplitPane";

interface SplitPaneHandleProps extends React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> {
  /** Ref to the panel this handle's collapse button toggles (usually the pane right before/after it). */
  targetPanelRef?: React.RefObject<ImperativePanelHandle | null>;
  /** Human label announced in the hover hint, e.g. "Element Library". */
  label: string;
  /** Optional keyboard shortcut shown in the hint, e.g. "⌘B". */
  shortcut?: string;
  orientation?: "horizontal" | "vertical";
}

function SplitPaneHandle({
  className,
  targetPanelRef,
  label,
  shortcut,
  orientation = "horizontal",
  ...props
}: SplitPaneHandleProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    const panel = targetPanelRef?.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setCollapsed(false);
    } else {
      panel.collapse();
      setCollapsed(true);
    }
  };

  const hint = shortcut
    ? `Click to collapse ${label} (${shortcut}) · Drag to resize`
    : `Click to collapse ${label} · Drag to resize`;

  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="split-pane-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex items-center justify-center transition-colors hover:bg-primary/30 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden",
        orientation === "vertical" ? "h-1.5 w-full cursor-row-resize" : "w-1.5 cursor-col-resize",
        className,
      )}
      {...props}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={hint}
            aria-expanded={!collapsed}
            title={hint}
            className={cn(
              "bg-border hover:bg-primary/50 z-10 flex items-center justify-center rounded-xs border transition-colors",
              orientation === "vertical" ? "h-3 w-4" : "h-4 w-3",
            )}
          >
            {orientation === "vertical" ? (
              <GripHorizontalIcon className="size-2.5" />
            ) : (
              <GripVerticalIcon className="size-2.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { SplitPaneGroup, SplitPane, SplitPaneHandle };
export type { ImperativePanelHandle };
