import React, { ReactNode } from 'react';

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  required?: boolean;
  disabled?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({ 
  label, 
  value, 
  onChange, 
  children,
  required = false,
  disabled = false
}) => (
  <div>
    <label className="form-label">{label}</label>
    <select
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className="form-select"
    >
      {children}
    </select>
  </div>
);