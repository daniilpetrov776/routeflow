import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Provider } from "react-redux";
import { store } from "./store";
import { ThemeProvider } from "./components/theme-provider";
import Home from "@/pages/home";

// Lazy loading для некритичных компонентов
const NotFound = lazy(() => import("@/pages/not-found").then(module => ({ default: module.default })));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route>
        <Suspense fallback={<div>Loading...</div>}>
          <NotFound />
        </Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
