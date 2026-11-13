import type { ReactNode } from "react";

/** A wall or screen card that collapses to one summary line. */
export default function CardShell({
  title,
  summary,
  open,
  onToggle,
  onDuplicate,
  onRemove,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`wall ${open ? "open" : ""}`}>
      <div className="card-head">
        <button type="button" className="card-toggle" aria-expanded={open} onClick={onToggle}>
          <span className="chev" aria-hidden="true">›</span>
          <span className="card-title">{title}</span>
          <span className="card-summary">{summary}</span>
        </button>
        <div className="row no-print card-actions">
          <button type="button" className="link small" onClick={onDuplicate}>Duplicate</button>
          <button type="button" className="link small danger-text" onClick={onRemove}>Remove</button>
        </div>
      </div>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
}
