'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { Search } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-text-primary">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            h-11 px-4 rounded-lg border border-slate-200 bg-white
            text-text-primary placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
            transition-all text-[15px]
            ${error ? 'border-error ring-2 ring-error/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-error text-sm">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={ref}
          className={`
            h-10 w-full pl-10 pr-4 rounded-lg border border-slate-200 bg-slate-50
            text-text-primary placeholder:text-slate-400
            focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
            transition-all text-sm
            ${className}
          `}
          placeholder="검색"
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
