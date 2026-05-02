import { RouterProvider } from 'react-router-dom';
import { useMemo } from 'react';
import { createAppRouter } from './routes';
import { Toaster } from './components/ui/sonner';
import { SystemSettingsBootstrap } from './components/shared/SystemSettingsBootstrap';
import { useNotificationConnection } from './features/notification/hooks/useNotificationConnection';
import './App.css';

function App() {
  const router = useMemo(() => createAppRouter(), []);
  useNotificationConnection();

  return (
    <>
      <SystemSettingsBootstrap />
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
