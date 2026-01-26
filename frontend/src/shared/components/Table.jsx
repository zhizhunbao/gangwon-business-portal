/**
 * Table Component
 */

import { cn } from "@shared/utils/helpers";

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
  loading,
  ...props
}) {
  // If columns and data are provided, render the table automatically
  if (columns && data) {
    const allSelected = data.length > 0 && selectedRows.length === data.length;
    const someSelected =
      selectedRows.length > 0 && selectedRows.length < data.length;

    // Get primary column for mobile card title (first column or column with key 'name' or 'title')
    const primaryColumn =
      columns.find((col) =>
        ["name", "title", "companyName", "id"].includes(col.key),
      ) || columns[0];

    return (
      <div className="overflow-x-auto">
        {/* Desktop Table View */}
        <table
          className={cn(
            "w-full divide-y divide-gray-200 hidden md:table",
            className,
          )}
          {...props}
        >
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
                        onSelectAll(
                          e.target.checked ? data.map((row) => row.id) : [],
                        );
                      }
                    }}
                  />
                </th>
              )}
              {columns.map((column) => {
                const align = column.align || "left";
                return (
                  <th
                    key={column.key}
                    className={cn(
                      "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider",
                      align === "left" && "text-left",
                      align === "center" && "text-center",
                      align === "right" && "text-right",
                      column.headerClassName,
                    )}
                    style={
                      column.width
                        ? { width: column.width, minWidth: column.width }
                        : undefined
                    }
                  >
                    {column.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={cn(
                  "transition-colors duration-150 hover:bg-gray-50",
                  onRowClick && "cursor-pointer",
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
                            onSelectRow(
                              selectedRows.filter((id) => id !== row.id),
                            );
                          }
                        }
                      }}
                    />
                  </td>
                )}
                {columns.map((column) => {
                  const value = row[column.key];
                  const displayValue = column.render
                    ? column.render(value, row, rowIndex)
                    : (value ?? "-");
                  const cellClassName = column.cellClassName || "";
                  const shouldWrap =
                    column.wrap !== false &&
                    (column.key === "address" || column.key === "description");
                  const align = column.align || "left";
                  return (
                    <td
                      key={column.key}
                      className={cn(
                        "px-6 py-4 text-sm text-gray-900",
                        shouldWrap ? "max-w-xs" : "whitespace-nowrap",
                        align === "left" && "text-left",
                        align === "center" && "text-center",
                        align === "right" && "text-right",
                        cellClassName,
                        column.className,
                      )}
                      style={
                        column.width
                          ? { width: column.width, minWidth: column.width }
                          : undefined
                      }
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="block md:hidden">
          {data.map((row, rowIndex) => (
            <div
              key={row.id || rowIndex}
              className={cn(
                "bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm",
                onRowClick && "cursor-pointer",
              )}
              onClick={() => onRowClick && onRowClick(row)}
            >
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                <div className="font-semibold text-gray-900 text-base">
                  {primaryColumn.render
                    ? primaryColumn.render(
                        row[primaryColumn.key],
                        row,
                        rowIndex,
                      )
                    : row[primaryColumn.key]}
                </div>
                {selectable && (
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
                          onSelectRow(
                            selectedRows.filter((id) => id !== row.id),
                          );
                        }
                      }
                    }}
                  />
                )}
              </div>
              <div className="space-y-2">
                {columns
                  .filter((column) => column.key !== primaryColumn.key)
                  .map((column) => {
                    const value = row[column.key];
                    const displayValue = column.render
                      ? column.render(value, row, rowIndex)
                      : (value ?? "-");
                    return (
                      <div
                        key={column.key}
                        className="flex flex-col sm:flex-row sm:items-center gap-2"
                      >
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider sm:w-1/3">
                          {column.label}
                        </div>
                        <div className="text-sm text-gray-900 sm:flex-1">
                          {displayValue}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Otherwise, render as before (manual table structure)
  return (
    <div className="overflow-x-auto md:-mx-4 md:px-4">
      <table
        className={cn("w-full divide-y divide-gray-200", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className }) {
  return <thead className={cn("bg-gray-50", className)}>{children}</thead>;
}

export function TableBody({ children, className }) {
  return (
    <tbody className={cn("bg-white divide-y divide-gray-200", className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className, ...props }) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150 hover:bg-gray-50",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ children, className, ...props }) {
  return (
    <th
      className={cn(
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }) {
  return (
    <td
      className={cn(
        "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export default Table;
