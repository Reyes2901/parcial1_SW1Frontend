import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { Providers } from './providers/Providers';

export default function App() {
  return (
    <Providers>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </Providers>
  );
}
