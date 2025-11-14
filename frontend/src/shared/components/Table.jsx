/**
 * Table Component
 */

import { cn } from '@shared/utils/helpers';

export function Table({ 
  children, 
  className, 
  columns, 
  data, 
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  ...props 
}) {
  // If columns and data are provided, render the table automatically
  if (columns && data) {
    const allSelected = data.length > 0 && selectedRows.length === data.length;
    const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

    return (
      <div className="overflow-x-auto">
        <table className={cn('table', className)} {...props}>
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => {
                      if (onSelectAll) {
                        onSelectAll(e.target.checked ? data.map(row => row.id) : []);
                      }
                    }}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={cn(
                  'bg-white hover:bg-gray-50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {selectable && (
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={selectedRows.includes(row.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (onSelectRow) {
                          if (e.target.checked) {
                            onSelectRow([...selectedRows, row.id]);
                          } else {
                            onSelectRow(selectedRows.filter(id => id !== row.id));
                          }
                        }
                      }}
                    />
                  </td>
                )}
                {columns.map((column) => {
                  const value = row[column.key];
                  return (
                    <td
                      key={column.key}
                      className={cn(
                        'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                        column.className
                      )}
                    >
                      {column.render ? column.render(value, row, rowIndex) : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Otherwise, render as before (manual table structure)
  return (
    <div className="overflow-x-auto">
      <table className={cn('table', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className }) {
  return <thead className={cn('bg-gray-50', className)}>{children}</thead>;
}

export function TableBody({ children, className }) {
  return <tbody className={cn('bg-white divide-y divide-gray-200', className)}>{children}</tbody>;
}

export function TableRow({ children, className, ...props }) {
  return <tr className={cn('hover:bg-gray-50', className)} {...props}>{children}</tr>;
}

export function TableHeader({ children, className, ...props }) {
  return (
    <th
      className={cn('px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }) {
  return (
    <td className={cn('px-6 py-4 whitespace-nowrap text-sm text-gray-900', className)} {...props}>
      {children}
    </td>
  );
}

