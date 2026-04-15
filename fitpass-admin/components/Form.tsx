interface FormProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export default function Form({ onSubmit, onCancel, loading, children }: FormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {children}
      
      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

interface InputProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}

export function Input({ name, label, type = 'text', placeholder, required, defaultValue }: InputProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
    </div>
  );
}

interface SelectProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
}

export function Select({ name, label, options, required, defaultValue }: SelectProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}