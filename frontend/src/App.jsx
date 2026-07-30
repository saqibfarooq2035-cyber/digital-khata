import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerLedger from './pages/CustomerLedger';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Payments from './pages/Payments';
import PaymentRequests from './pages/PaymentRequests';
import Receipts from './pages/Receipts';
import SMS from './pages/SMS';
import WhatsApp from './pages/WhatsApp';
import Staff from './pages/Staff';
import { PortalLayout, PortalDashboard, PortalPayments, PortalMyRequests, PortalSchedule, PortalReceipts } from './pages/portal';
import { useAuthContext } from './context/AuthContext';

function AdminStaffRoute({ children }) {
  const { isAuthenticated, role } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return role === 'Customer' ? <Navigate to="/portal" replace /> : children;
}

function CustomerRoute({ children }) {
  const { isAuthenticated, role } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return role === 'Customer' ? children : <Navigate to="/dashboard" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, role } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return role === 'Admin' ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  const { isAuthenticated, role } = useAuthContext();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <ErrorBoundary>
            <Login />
          </ErrorBoundary>
        }
      />
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={role === 'Customer' ? '/portal' : '/dashboard'} replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route element={<AdminStaffRoute><Layout /></AdminStaffRoute>}>
        <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/customers" element={<ErrorBoundary><Customers /></ErrorBoundary>} />
        <Route path="/customers/:id/ledger" element={<ErrorBoundary><CustomerLedger /></ErrorBoundary>} />
        <Route path="/products" element={<ErrorBoundary><Products /></ErrorBoundary>} />
        <Route path="/sales" element={<ErrorBoundary><Sales /></ErrorBoundary>} />
        <Route path="/payments" element={<ErrorBoundary><Payments /></ErrorBoundary>} />
        <Route path="/payment-requests" element={<ErrorBoundary><PaymentRequests /></ErrorBoundary>} />
        <Route path="/receipts" element={<ErrorBoundary><Receipts /></ErrorBoundary>} />
        <Route path="/sms" element={<ErrorBoundary><SMS /></ErrorBoundary>} />
        <Route path="/whatsapp" element={<ErrorBoundary><WhatsApp /></ErrorBoundary>} />
        <Route
          path="/staff"
          element={
            <AdminRoute>
              <ErrorBoundary>
                <Staff />
              </ErrorBoundary>
            </AdminRoute>
          }
        />
      </Route>
      <Route path="/portal" element={<CustomerRoute><PortalLayout /></CustomerRoute>}>
        <Route index element={<ErrorBoundary><PortalDashboard /></ErrorBoundary>} />
        <Route path="payments" element={<ErrorBoundary><PortalPayments /></ErrorBoundary>} />
        <Route path="requests" element={<ErrorBoundary><PortalMyRequests /></ErrorBoundary>} />
        <Route path="schedule" element={<ErrorBoundary><PortalSchedule /></ErrorBoundary>} />
        <Route path="receipts" element={<ErrorBoundary><PortalReceipts /></ErrorBoundary>} />
      </Route>
    </Routes>
  );
}

export default App;
