import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import EditRecordModal from './EditRecordModal';
import { database } from '../db';
import { Alert } from 'react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../db', () => ({
  database: {
    write: jest.fn(async (cb) => {
      await cb();
    }),
  },
}));

jest.mock('../db/sync', () => ({
  pushNow: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

describe('EditRecordModal Component', () => {
  const mockRecord = {
    created_at: new Date('2026-03-20T10:00:00Z').getTime(),
    description: 'Грудь (15м)',
    update: jest.fn(async (cb) => { await cb(mockRecord); }),
    markAsDeleted: jest.fn(),
  };

  const mockTarget = {
    kind: 'feeding' as const,
    record: mockRecord as any,
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render if target is null', () => {
    const { toJSON } = render(<EditRecordModal target={null} onClose={mockOnClose} />);
    expect(toJSON()).toBeNull();
  });

  it('renders correctly for feeding and handles save', async () => {
    render(<EditRecordModal target={mockTarget} onClose={mockOnClose} />);

    // Check title
    expect(screen.getByText('Редактировать кормление')).toBeTruthy();

    // Check initial text input value
    expect(screen.getByDisplayValue('Грудь (15м)')).toBeTruthy();

    // Fire text change
    fireEvent.changeText(screen.getByDisplayValue('Грудь (15м)'), 'Грудь (20м)');

    // Press save
    fireEvent.press(screen.getByText('Сохранить'));

    // Wait for the mock update to be called and Alert to be shown
    await waitFor(() => {
      expect(database.write).toHaveBeenCalled();
      expect(mockRecord.update).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles delete action', async () => {
    render(<EditRecordModal target={mockTarget} onClose={mockOnClose} />);

    fireEvent.press(screen.getByLabelText('Удалить'));
    
    expect(Alert.alert).toHaveBeenCalled();
    
    // Simulate user pressing "Удалить" in the Alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const deleteButton = buttons.find((b: any) => b.style === 'destructive');
    
    await deleteButton.onPress();
    
    expect(mockRecord.markAsDeleted).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
