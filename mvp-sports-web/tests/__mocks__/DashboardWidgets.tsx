import React from 'react';

export function PanelGlass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function TarjetaKpi(props: any) {
  return <div data-testid="tarjeta-kpi">{props.valor || props.value}</div>;
}

export function SystemStatusRow({ name, status }: { name: string; status: string; ping?: string }) {
  return <div data-testid="system-status">{name}: {status}</div>;
}

export function BotonAccion({ etiqueta, onClick }: { icon?: React.ReactNode; etiqueta?: string; onClick?: () => void }) {
  return <button onClick={onClick}>{etiqueta}</button>;
}
