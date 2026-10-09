import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PanelGlass, TarjetaKpi, BotonAccion } from '@/components/ui/DashboardWidgets';

describe('PanelGlass', () => {
  it('renders children', () => {
    render(<PanelGlass><span>Content</span></PanelGlass>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies className', () => {
    const { container } = render(<PanelGlass className="custom-class"><span>Content</span></PanelGlass>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('TarjetaKpi', () => {
  it('renders with titulo and valor', () => {
    render(<TarjetaKpi titulo="MRR" valor="$100,000" />);
    expect(screen.getByText('$100,000')).toBeInTheDocument();
  });

  it('renders with label and value (alias props)', () => {
    render(<TarjetaKpi label="Users" value="500" />);
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('shows positive trend', () => {
    const { container } = render(<TarjetaKpi label="Test" value="100" tendencia="+5%" tendenciaPositiva={true} />);
    expect(container.textContent).toContain('+5%');
  });

  it('shows negative trend', () => {
    const { container } = render(<TarjetaKpi label="Test" value="100" tendencia="-2%" tendenciaPositiva={false} />);
    expect(container.textContent).toContain('-2%');
  });
});

describe('BotonAccion', () => {
  it('renders label', () => {
    render(<BotonAccion etiqueta="Crear" />);
    expect(screen.getByText('Crear')).toBeInTheDocument();
  });
});
