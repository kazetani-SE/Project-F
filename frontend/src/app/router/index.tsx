import {ROUTE_PATHS} from "./route.ts";
import PlaygroundPage from "../../pages/playground/PlaygroundPage.tsx";
import {createBrowserRouter} from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout.tsx";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                path: ROUTE_PATHS.ALL,
                element: <PlaygroundPage />,
            },
        ],
    },
]);