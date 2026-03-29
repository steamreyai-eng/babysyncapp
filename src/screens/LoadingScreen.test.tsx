import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders correctly', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Синхронизация...')).toBeTruthy();
  });
});
