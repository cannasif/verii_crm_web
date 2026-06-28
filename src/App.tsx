import { RouterProvider } from 'react-router-dom';
import { useMemo } from 'react';
import { createAppRouter } from './routes';
import { Toaster } from './components/ui/sonner';
import { SystemSettingsBootstrap } from './components/shared/SystemSettingsBootstrap';
import { GlobalNetworkIndicator } from './components/shared/GlobalNetworkIndicator';
import { useNotificationConnection } from './features/notification/hooks/useNotificationConnection';
import './App.css';

function App() {
  const router = useMemo(() => createAppRouter(), []);
  useNotificationConnection();

  return (
    <>
      <SystemSettingsBootstrap />
      <GlobalNetworkIndicator />
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
