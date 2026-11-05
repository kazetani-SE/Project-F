import { createBrowserRouter } from 'react-router-dom';
import { ROUTE_PATHS } from './route.ts';
import MainLayout from '../../components/layout/MainLayout.tsx';
import PlaygroundPage from '../../pages/playground/PlaygroundPage.tsx';
import DocumentsPage from '../../pages/documents/DocumentsPage.tsx';
import KnowledgePage from '../../pages/knowledge/KnowledgePage.tsx';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                path: ROUTE_PATHS.EVENT_DOCUMENTS,
                element: <DocumentsPage />,
            },
            {
                path: ROUTE_PATHS.EVENT_KNOWLEDGE,
                element: <KnowledgePage />,
            },
            {
                path: ROUTE_PATHS.ALL,
                element: <PlaygroundPage />,
            },
        ],
    },
]);
