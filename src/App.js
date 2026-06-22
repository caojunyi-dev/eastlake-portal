import AdminDashboard from './AdminDashboard';
import ClientPortal from './ClientPortal';

export default function App() {
  const isAdmin = window.location.pathname.startsWith('/admin');
  return isAdmin ? <AdminDashboard/> : <ClientPortal/>;
}
