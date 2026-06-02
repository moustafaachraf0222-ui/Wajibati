import type { ReactNode } from 'react';

export function ResponsiveTable({
  columns,
  children,
  emptyText
}: {
  columns: string[];
  children: ReactNode;
  emptyText: string;
}) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      {Array.isArray(rows) && rows.length === 0 && <p className="empty-state">{emptyText}</p>}
    </div>
  );
}
