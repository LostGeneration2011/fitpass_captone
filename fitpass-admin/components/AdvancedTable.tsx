import React, { useState, useMemo } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
  filterValue?: (item: any) => string; // Function to extract filter value from complex data
}

interface AdvancedTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  itemsPerPage?: number;
  emptyMessage?: string;
}

type SortOrder = 'asc' | 'desc' | null;

// Helper functions for improved search
const removeDiacritics = (str: string): string => {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd').replace(/Đ/g, 'D'); // Handle Vietnamese đ
};

const fuzzySearch = (searchTerm: string, target: string): boolean => {
  if (!searchTerm || !target) return false;
  
  const search = removeDiacritics(searchTerm.toLowerCase().trim());
  const text = removeDiacritics(target.toLowerCase());
  
  // 1. Exact match (highest priority)
  if (text.includes(search)) return true;
  
  // 2. Word boundary match (medium priority)
  const searchWords = search.split(/\s+/);
  const allWordsFound = searchWords.every(word => {
    if (word.length < 2) return true; // Skip very short words
    return text.includes(word);
  });
  if (allWordsFound) return true;
  
  // 3. Character sequence match (lower priority)
  if (search.length >= 3) {
    let textIndex = 0;
    for (const char of search) {
      const found = text.indexOf(char, textIndex);
      if (found === -1) return false;
      textIndex = found + 1;
    }
    return true;
  }
  
  return false;
};

const scoreMatch = (searchTerm: string, target: string): number => {
  if (!searchTerm || !target) return 0;
  
  const search = removeDiacritics(searchTerm.toLowerCase().trim());
  const text = removeDiacritics(target.toLowerCase());
  
  // Exact match gets highest score
  if (text === search) return 100;
  if (text.startsWith(search)) return 90;
  if (text.includes(search)) return 80;
  
  // Word match gets medium score
  const searchWords = search.split(/\s+/);
  const textWords = text.split(/\s+/);
  let wordMatches = 0;
  
  searchWords.forEach(searchWord => {
    if (textWords.some(textWord => textWord.includes(searchWord))) {
      wordMatches++;
    }
  });
  
  if (wordMatches > 0) {
    return 60 + (wordMatches / searchWords.length) * 20;
  }
  
  return 0;
};

export default function AdvancedTable({
  columns,
  data,
  loading = false,
  searchable = true,
  filterable = true,
  itemsPerPage = 10,
  emptyMessage = "No data available"
}: AdvancedTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search logic with improved fuzzy search
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search with fuzzy matching and scoring
    if (searchTerm && searchTerm.trim()) {
      const searchResults = result
        .map(item => {
          let maxScore = 0;
          let hasMatch = false;
          
          // Search across all searchable columns and common fields
          columns.forEach(col => {
            const value = item[col.key]?.toString() || '';
            if (fuzzySearch(searchTerm, value)) {
              hasMatch = true;
              const score = scoreMatch(searchTerm, value);
              maxScore = Math.max(maxScore, score);
            }
            
            // Also search in nested fields like fullName, email etc
            if (typeof item[col.key] === 'object' && item[col.key] !== null) {
              const objStr = JSON.stringify(item[col.key]).toLowerCase();
              if (fuzzySearch(searchTerm, objStr)) {
                hasMatch = true;
                maxScore = Math.max(maxScore, scoreMatch(searchTerm, objStr));
              }
            }
          });
          
          // Additional search in common fields that might not be in columns
          const commonFields = ['fullName', 'email', 'name', 'title', 'description'];
          commonFields.forEach(field => {
            if (item[field]) {
              const value = item[field].toString();
              if (fuzzySearch(searchTerm, value)) {
                hasMatch = true;
                const score = scoreMatch(searchTerm, value);
                maxScore = Math.max(maxScore, score);
              }
            }
          });
          
          return { item, score: maxScore, hasMatch };
        })
        .filter(result => result.hasMatch)
        .sort((a, b) => b.score - a.score) // Sort by relevance score
        .map(result => result.item);
        
      result = searchResults;
    }

    // Apply filters with fuzzy matching
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim()) {
        result = result.filter(item => {
          const column = columns.find(col => col.key === key);
          let itemValue = '';
          
          if (column?.filterValue) {
            // Use custom filterValue function if provided
            itemValue = column.filterValue(item) || '';
          } else {
            // Fall back to direct key access
            itemValue = item[key]?.toString() || '';
          }
          
          return fuzzySearch(value, itemValue);
        });
      }
    });

    // Apply sorting
    if (sortColumn && sortOrder) {
      result.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        // Handle different data types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue, 'vi', { numeric: true, sensitivity: 'base' });
          return sortOrder === 'asc' ? comparison : -comparison;
        }
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, filters, sortColumn, sortOrder, columns]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (columnKey: string, sortable: boolean = true) => {
    if (!sortable) return;
    
    if (sortColumn === columnKey) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortColumn(null);
        setSortOrder(null);
      } else {
        setSortOrder('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (columnKey: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: string, sortable: boolean = true) => {
    if (!sortable) return null;
    
    if (sortColumn === columnKey) {
      return sortOrder === 'asc' ? 
        <ChevronUpIcon className="h-4 w-4" /> : 
        <ChevronDownIcon className="h-4 w-4" />;
    }
    return <ChevronUpDownIcon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {(Array.isArray([...Array(5)]) ? [...Array(5)] : []).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-visible">
      {/* Search and Filter Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          {searchable && (
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm gần đúng: tên, email, hoặc bất kỳ thông tin nào..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {searchTerm && (
                  <div className="absolute right-2 top-2 text-xs text-gray-500">
                    {filteredData.length} kết quả
                  </div>
                )}
              </div>
              {searchTerm && (
                <div className="mt-1 text-xs text-gray-500">
                  💡 Gợi ý: Có thể gõ thiếu dấu, viết tắt hoặc không đúng thứ tự từ
                </div>
              )}
            </div>
          )}

          {/* Filter Toggle */}
          {filterable && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              {(Object.values(filters).some(v => v) || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter Inputs */}
        {showFilters && filterable && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {columns
              .filter(col => col.filterable !== false)
              .map(column => (
                <div key={column.key}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Filter by {column.label}
                  </label>
                  <input
                    type="text"
                    placeholder={`Filter ${column.label}...`}
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {(Array.isArray(columns) ? columns : []).map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                  } ${column.key === 'actions' ? 'sticky right-0 z-20 bg-gray-50 dark:bg-gray-700 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.2)]' : ''}`}
                  onClick={() => handleSort(column.key, column.sortable)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {getSortIcon(column.key, column.sortable)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              (Array.isArray(paginatedData) ? paginatedData : []).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {(Array.isArray(columns) ? columns : []).map((column) => (
                    <td key={column.key} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white ${column.key === 'actions' ? 'sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.2)]' : ''}`}>
                      {column.render 
                        ? column.render(item[column.key], item)
                        : item[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Items per page selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">Hiển thị:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const newItemsPerPage = parseInt(e.target.value);
                const newTotalPages = Math.ceil(filteredData.length / newItemsPerPage);
                const newCurrentPage = Math.min(currentPage, newTotalPages);
                setCurrentPage(newCurrentPage);
              }}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-700 dark:text-gray-300">/ trang</span>
          </div>

          {/* Mobile pagination */}
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Trang</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    setCurrentPage(page);
                  }
                }}
                className="w-16 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">/ {totalPages}</span>
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp
            </button>
          </div>
          
          {/* Desktop pagination */}
          <div className="hidden sm:flex sm:items-center sm:justify-between sm:w-full">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Hiển thị <span className="font-medium">{startIndex + 1}</span> đến{' '}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, filteredData.length)}
                </span>{' '}
                trong tổng số <span className="font-medium">{filteredData.length}</span> kết quả
              </p>
              
              {/* Jump to page */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">Đến trang:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">/ {totalPages}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* First page */}
              {currentPage > 3 && totalPages > 5 && (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className="relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    1
                  </button>
                  <span className="px-2 text-gray-500">...</span>
                </>
              )}
              
              {/* Previous */}
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border border-blue-600'
                        : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {/* Next */}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
              
              {/* Last page */}
              {currentPage < totalPages - 2 && totalPages > 5 && (
                <>
                  <span className="px-2 text-gray-500">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}