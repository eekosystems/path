import { GenericSection } from '../types/generic';

export function formatGenericSectionsForGeneration(sections: GenericSection[]): string {
  let formattedData = '';
  
  sections.forEach(section => {
    if (section.fields.some(field => field.value)) {
      formattedData += `\n${section.title}:\n`;
      section.fields.forEach(field => {
        if (field.value) {
          formattedData += `${field.label}: ${field.value}\n`;
        }
      });
    }
  });
  
  return formattedData.trim();
}

export function createDocumentContext(sections: GenericSection[]): Record<string, any> {
  const context: Record<string, any> = {};
  
  sections.forEach(section => {
    const sectionData: Record<string, string> = {};
    section.fields.forEach(field => {
      if (field.value) {
        sectionData[field.label.toLowerCase().replace(/\s+/g, '_')] = field.value;
      }
    });
    if (Object.keys(sectionData).length > 0) {
      context[section.title.toLowerCase().replace(/\s+/g, '_')] = sectionData;
    }
  });
  
  return context;
}