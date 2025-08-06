export type FieldType = 'text' | 'longText' | 'date' | 'select' | 'number' | 'email' | 'phone' | 'url';

export interface GenericField {
  id: string;
  label: string;
  value: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select type
}

export interface GenericSection {
  id: string;
  title: string;
  fields: GenericField[];
  isExpanded: boolean;
  order: number;
}

export interface DocumentData {
  id: string;
  title: string;
  type: string; // 'contract', 'agreement', 'form', etc.
  sections: GenericSection[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'longText', label: 'Long Text' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' }
];

export const DOCUMENT_TEMPLATES = {
  immigration: {
    id: 'immigration',
    name: 'Immigration Document',
    sections: [
      {
        id: 'beneficiary',
        title: 'Beneficiary Details',
        fields: [
          { id: 'beneficiary_name', label: 'Name', value: '', type: 'text' as FieldType },
          { id: 'beneficiary_nationality', label: 'Nationality', value: '', type: 'text' as FieldType },
          { id: 'beneficiary_location', label: 'Current Location', value: '', type: 'text' as FieldType }
        ],
        isExpanded: true,
        order: 1
      },
      {
        id: 'petitioner',
        title: 'Petitioner Details',
        fields: [
          { id: 'petitioner_name', label: 'Name', value: '', type: 'text' as FieldType },
          { id: 'petitioner_address', label: 'Address', value: '', type: 'longText' as FieldType }
        ],
        isExpanded: true,
        order: 2
      },
      {
        id: 'case',
        title: 'Case Specifics',
        fields: [
          { id: 'case_number', label: 'Case Number', value: '', type: 'text' as FieldType },
          { id: 'attorney_name', label: 'Attorney Name', value: '', type: 'text' as FieldType }
        ],
        isExpanded: true,
        order: 3
      }
    ]
  }
};