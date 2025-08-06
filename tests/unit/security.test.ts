import { 
  sanitizeInput, 
  validateApiKey, 
  validateFileSize, 
  validateFileType 
} from '../../src/main/services/security';

describe('Security Service', () => {
  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("XSS")</script> World';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello  World');
    });

    it('should remove iframe tags', () => {
      const input = 'Check this <iframe src="evil.com"></iframe> out';
      const result = sanitizeInput(input);
      expect(result).toBe('Check this  out');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeInput(input);
      expect(result).toBe('<a href="alert(1)">Click</a>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeInput(input);
      expect(result).toBe('<div "alert(1)">Click me</div>');
    });

    it('should handle normal text', () => {
      const input = 'This is normal text with no malicious content';
      const result = sanitizeInput(input);
      expect(result).toBe('This is normal text with no malicious content');
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct OpenAI API key format', () => {
      const validKey = 'sk-' + 'a'.repeat(48);
      expect(validateApiKey(validKey)).toBe(true);
    });

    it('should reject keys without sk- prefix', () => {
      const invalidKey = 'pk-' + 'a'.repeat(48);
      expect(validateApiKey(invalidKey)).toBe(false);
    });

    it('should reject keys with wrong length', () => {
      const shortKey = 'sk-' + 'a'.repeat(20);
      const longKey = 'sk-' + 'a'.repeat(60);
      expect(validateApiKey(shortKey)).toBe(false);
      expect(validateApiKey(longKey)).toBe(false);
    });

    it('should reject keys with invalid characters', () => {
      const invalidKey = 'sk-' + '!@#$%^&*'.repeat(6);
      expect(validateApiKey(invalidKey)).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    it('should accept files under 10MB', () => {
      expect(validateFileSize(5 * 1024 * 1024)).toBe(true);
      expect(validateFileSize(9.9 * 1024 * 1024)).toBe(true);
    });

    it('should accept files exactly 10MB', () => {
      expect(validateFileSize(MAX_SIZE)).toBe(true);
    });

    it('should reject files over 10MB', () => {
      expect(validateFileSize(11 * 1024 * 1024)).toBe(false);
      expect(validateFileSize(20 * 1024 * 1024)).toBe(false);
    });
  });

  describe('validateFileType', () => {
    it('should accept allowed file extensions', () => {
      expect(validateFileType('document.pdf')).toBe(true);
      expect(validateFileType('letter.docx')).toBe(true);
      expect(validateFileType('notes.txt')).toBe(true);
      expect(validateFileType('README.md')).toBe(true);
    });

    it('should accept files with uppercase extensions', () => {
      expect(validateFileType('document.PDF')).toBe(true);
      expect(validateFileType('letter.DOCX')).toBe(true);
    });

    it('should reject disallowed file extensions', () => {
      expect(validateFileType('script.js')).toBe(false);
      expect(validateFileType('program.exe')).toBe(false);
      expect(validateFileType('image.jpg')).toBe(false);
      expect(validateFileType('data.xlsx')).toBe(false);
    });

    it('should handle files with multiple dots', () => {
      expect(validateFileType('my.document.pdf')).toBe(true);
      expect(validateFileType('my.script.js')).toBe(false);
    });
  });
});