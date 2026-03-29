import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import DateFilter from './DateFilter';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('DateFilter', () => {
  beforeEach(() => {
    // Mock system time to a fixed date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-20T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly with given date', () => {
    const mockDateChange = jest.fn();
    const date = new Date('2026-03-15T12:00:00Z');
    
    render(<DateFilter selectedDate={date} onDateChange={mockDateChange} />);
    
    expect(screen.getByText('15 марта')).toBeTruthy();
    // It should not render "Сегодня" badge because 15 is not 20
    expect(screen.queryByText('Сегодня')).toBeNull();
  });

  it('renders "Сегодня" badge when date is today', () => {
    const mockDateChange = jest.fn();
    const date = new Date('2026-03-20T12:00:00Z');
    
    render(<DateFilter selectedDate={date} onDateChange={mockDateChange} />);
    
    expect(screen.getByText('Сегодня')).toBeTruthy();
  });

  it('calls onDateChange with -1 day when left arrow is pressed', () => {
    const mockDateChange = jest.fn();
    const date = new Date('2026-03-15T12:00:00Z');
    
    render(<DateFilter selectedDate={date} onDateChange={mockDateChange} />);
    
    // Rely on testIDs added to the component
    const backBtn = screen.getByTestId('prev-btn');
    
    // buttons[0] is back, buttons[1] is today, buttons[2] is forward
    fireEvent.press(backBtn);
    
    expect(mockDateChange).toHaveBeenCalledTimes(1);
    const calledDate: Date = mockDateChange.mock.calls[0][0];
    expect(calledDate.getDate()).toBe(14);
  });

  it('calls onDateChange with +1 day when right arrow is pressed', () => {
    const mockDateChange = jest.fn();
    const date = new Date('2026-03-15T12:00:00Z');
    
    render(<DateFilter selectedDate={date} onDateChange={mockDateChange} />);
    
    const forwardBtn = screen.getByTestId('next-btn');
    
    fireEvent.press(forwardBtn); // forward
    
    expect(mockDateChange).toHaveBeenCalledTimes(1);
    const calledDate: Date = mockDateChange.mock.calls[0][0];
    expect(calledDate.getDate()).toBe(16);
  });

  it('calls onDateChange with today when middle section is pressed', () => {
    const mockDateChange = jest.fn();
    const date = new Date('2026-03-15T12:00:00Z');
    
    render(<DateFilter selectedDate={date} onDateChange={mockDateChange} />);
    
    const todayBtn = screen.getByTestId('today-btn');
    
    fireEvent.press(todayBtn); // today
    
    expect(mockDateChange).toHaveBeenCalledTimes(1);
    const calledDate: Date = mockDateChange.mock.calls[0][0];
    // Should be today (20)
    expect(calledDate.getDate()).toBe(20);
  });
});
