import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import ErrorBoundary from './ErrorBoundary';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

beforeAll(() => {
  // Prevent React from logging the error boundary crashes to console during tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

const ProblemChild = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test crash!');
  }
  return <Text>All good!</Text>;
};

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('All good!')).toBeTruthy();
    expect(screen.queryByText('Упс! Что-то пошло не так')).toBeNull();
  });

  it('renders fallback UI when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('All good!')).toBeNull();
    expect(screen.getByText('Упс! Что-то пошло не так')).toBeTruthy();
    expect(screen.getByText('Test crash!')).toBeTruthy();
  });

  it('resets error state when reset button is pressed', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Упс! Что-то пошло не так')).toBeTruthy();

    // Re-rendering with a fixed child first, but error UI is still active due to state
    rerender(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    // The reset button clears the error state
    fireEvent.press(screen.getByText('Попробовать снова'));

    // Error UI should be gone, child should be back
    expect(screen.queryByText('Упс! Что-то пошло не так')).toBeNull();
    expect(screen.getByText('All good!')).toBeTruthy();
  });
});
