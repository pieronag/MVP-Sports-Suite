import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MetricCard from '@/components/dashboard/MetricCard';

describe('MetricCard', () => {
  const Icon = ({ className }: { className?: string }) => <svg className={className} data-testid="icon" />;

  it('renders label and value', () => {
    render(<MetricCard label="Ingresos" value="$50,000" icon={Icon} color="emerald" />);
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('renders subtext when provided', () => {
    render(<MetricCard label="Usuarios" value="150" icon={Icon} color="blue" subtext="Activos hoy" />);
    expect(screen.getByText('Activos hoy')).toBeInTheDocument();
  });

  it('renders without subtext when not provided', () => {
    render(<MetricCard label="Test" value="0" icon={Icon} color="amber" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(<MetricCard label="Test" value="0" icon={Icon} color="purple" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
