import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';

describe('PrivacyPolicyScreen', () => {
  it('renders correctly', () => {
    render(<PrivacyPolicyScreen />);
    
    expect(screen.getByText('Политика конфиденциальности')).toBeTruthy();
    expect(screen.getByText('Какие данные мы собираем')).toBeTruthy();
    expect(screen.getByText('Как мы используем данные')).toBeTruthy();
    expect(screen.getByText('Безопасность')).toBeTruthy();
    expect(screen.getByText('privacy@babysync.app')).toBeTruthy();
  });
});
