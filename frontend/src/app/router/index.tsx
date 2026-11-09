import type { RouteObject } from 'react-router-dom';
import { ROUTE_PATHS } from './route.ts';
import PlaygroundPage from '../../pages/playground/PlaygroundPage.tsx';
import DocumentsPage from '../../pages/documents/DocumentsPage.tsx';
import KnowledgePage from '../../pages/knowledge/KnowledgePage.tsx';

export const shellRoutes: RouteObject[] = [
    { path: ROUTE_PATHS.EVENT_DOCUMENTS, element: <DocumentsPage /> },
    { path: ROUTE_PATHS.EVENT_KNOWLEDGE, element: <KnowledgePage /> },
    { path: ROUTE_PATHS.ALL, element: <PlaygroundPage /> },
];
