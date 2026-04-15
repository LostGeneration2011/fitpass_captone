interface TableProps {
  headers: string[];
  data: any[];
  renderRow: (item: any, index: number) => React.ReactNode;
  loading?: boolean;
}

export default function Table({ headers, data, renderRow, loading }: TableProps) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {(Array.isArray(headers) ? headers : []).map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No data available
              </td>
            </tr>
          ) : (
            (Array.isArray(data) ? data : []).map((item, index) => renderRow(item, index))
          )}
        </tbody>
      </table>
    </div>
  );
}