import { RouterProvider } from 'react-router-dom';
import { useMemo } from 'react';
import { createAppRouter } from './routes';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  const router = useMemo(() => createAppRouter(), []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
