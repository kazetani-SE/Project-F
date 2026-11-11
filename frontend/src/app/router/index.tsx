import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTE_PATHS } from './route.ts';
import MainLayout from '../../components/layout/MainLayout.tsx';
import FinanceDashboardPage from '../../pages/finance/dashboard/FinanceDashboardPage.tsx';
import BudgetItemsPage from '../../pages/finance/budgets/BudgetItemsPage.tsx';
import ExpensesPage from '../../pages/finance/expenses/ExpensesPage.tsx';
import BenchmarkPage from '../../pages/finance/benchmarks/BenchmarkPage.tsx';
import PlaygroundPage from '../../pages/playground/PlaygroundPage.tsx';
import DocumentsPage from '../../pages/documents/DocumentsPage.tsx';
import KnowledgePage from '../../pages/knowledge/KnowledgePage.tsx';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                index: true,
                element: <Navigate to="/overview" replace />,
            },
            {
                path: ROUTE_PATHS.OVERVIEW,
                element: <FinanceDashboardPage />,
            },
            {
                path: ROUTE_PATHS.FINANCE_DASHBOARD,
                element: <FinanceDashboardPage />,
            },
            {
                path: ROUTE_PATHS.FINANCE_BUDGETS,
                element: <BudgetItemsPage />,
            },
            {
                path: ROUTE_PATHS.FINANCE_EXPENSES,
                element: <ExpensesPage />,
            },
            {
                path: ROUTE_PATHS.FINANCE_BENCHMARKS,
                element: <BenchmarkPage />,
            },
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