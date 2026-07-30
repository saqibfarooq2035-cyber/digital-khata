import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

console.log('✅ Frontend routing updated for 3 roles!');
console.log('✅ Customer Portal Layout created!');
console.log('✅ All Portal pages created — Dashboard, Payments, Schedule, Receipts!');
console.log('✅ Admin customer login management UI complete!');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              success: {
                style: { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
                iconTheme: { primary: '#059669', secondary: '#ECFDF5' },
              },
              error: {
                style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
                iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
