import React from 'react';

interface FormInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = 'text',
  required = false,
  disabled = false
}) => (
  <div>
    <label className="form-label">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className="form-input"
    />
  </div>
);