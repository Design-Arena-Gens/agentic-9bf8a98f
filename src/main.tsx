import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Route, Router, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './routes/Home';
import ChatRoom from './routes/ChatRoom';
import Admin from './routes/Admin';
import './styles/tailwind.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/chat/:roomId" component={ChatRoom as any} />
          <Route path="/admin" component={Admin} />
        </Switch>
      </Router>
    </QueryClientProvider>
  </StrictMode>
);
