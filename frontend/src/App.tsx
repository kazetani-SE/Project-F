import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './components/ui/ToastProvider';
import { router } from './app/router';

export default function App() {
    return <AuthProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></AuthProvider>;
}
