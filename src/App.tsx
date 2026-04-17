import { RouterProvider } from 'react-router-dom';
import { useMemo } from 'react';
import { createAppRouter } from './routes';
import { Toaster } from './components/ui/sonner';
import { SystemSettingsBootstrap } from './components/shared/SystemSettingsBootstrap';
import './App.css';

function App() {
  const router = useMemo(() => createAppRouter(), []);

  return (
    <>
      <SystemSettingsBootstrap />
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
