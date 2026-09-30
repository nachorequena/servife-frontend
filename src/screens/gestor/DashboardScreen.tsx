import { PantallaPendiente } from '../../components';

/** Servicios activos y validaciones pendientes. Sin incidencias (D05). */
export function DashboardScreen() {
  return <PantallaPendiente titulo="Dashboard" respaldo="CU12 · CU14 · D05" endpoints={['E5', 'E9']} />;
}
