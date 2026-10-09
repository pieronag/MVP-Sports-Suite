import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import RevenueChart from '@/components/dashboard/RevenueChart';

const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);

describe('RevenueChart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('renders title for historical mode', () => {
    render(<RevenueChart data={[]} isHistorical={true} revenue={0} formatCLP={formatCLP} />);
    expect(screen.getByText(/Evolución de ventas/i)).toBeInTheDocument();
  });

  it('renders title for real-time mode', () => {
    render(<RevenueChart data={[]} isHistorical={false} revenue={100000} formatCLP={formatCLP} />);
    expect(screen.getByText(/Flujo diario estimado/i)).toBeInTheDocument();
  });

  it('shows daily average in non-historical mode', () => {
    render(<RevenueChart data={[]} isHistorical={false} revenue={900000} formatCLP={formatCLP} />);
    expect(screen.getByText('$30.000')).toBeInTheDocument();
    expect(screen.getByText(/Promedio por día/i)).toBeInTheDocument();
  });

  it('does not show daily average in historical mode', () => {
    render(<RevenueChart data={[]} isHistorical={true} revenue={900000} formatCLP={formatCLP} />);
    expect(screen.queryByText(/Promedio por día/i)).not.toBeInTheDocument();
  });
});
