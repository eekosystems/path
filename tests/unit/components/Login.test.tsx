import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../../../src/renderer/components/Login';
import { useStore } from '../../../src/renderer/store';

// Mock the store
jest.mock('../../../src/renderer/store');

describe('Login Component', () => {
  const mockSetUser = jest.fn();
  const mockAddNotification = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useStore as unknown as jest.Mock).mockReturnValue({
      setUser: mockSetUser,
      addNotification: mockAddNotification,
    });
  });

  it('renders login form correctly', () => {
    render(<Login onSuccess={mockOnSuccess} />);
    
    expect(screen.getByText('Clerk')).toBeInTheDocument();
    expect(screen.getByText('AI Immigration Letter Assistant')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows default credentials hint', () => {
    render(<Login onSuccess={mockOnSuccess} />);
    
    expect(screen.getByText(/Default credentials: admin@clerk.app \/ admin123/)).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const mockUser = { id: '1', email: 'admin@clerk.app', name: 'Admin', role: 'admin' };
    global.window.electronAPI.login = jest.fn().mockResolvedValue({
      success: true,
      user: mockUser,
    });

    render(<Login onSuccess={mockOnSuccess} />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await userEvent.type(emailInput, 'admin@clerk.app');
    await userEvent.type(passwordInput, 'admin123');
    
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockAddNotification).toHaveBeenCalledWith('Successfully logged in', 'success');
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles login failure', async () => {
    global.window.electronAPI.login = jest.fn().mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
    });

    render(<Login onSuccess={mockOnSuccess} />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await userEvent.type(emailInput, 'wrong@email.com');
    await userEvent.type(passwordInput, 'wrongpassword');
    
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      expect(mockSetUser).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('disables form during submission', async () => {
    global.window.electronAPI.login = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<Login onSuccess={mockOnSuccess} />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await userEvent.type(emailInput, 'admin@clerk.app');
    await userEvent.type(passwordInput, 'admin123');
    
    fireEvent.click(submitButton);

    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
  });

  it('handles missing electron API', async () => {
    const originalAPI = global.window.electronAPI;
    delete (global.window as any).electronAPI;

    render(<Login onSuccess={mockOnSuccess} />);
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Authentication service not available')).toBeInTheDocument();
    });

    global.window.electronAPI = originalAPI;
  });
});