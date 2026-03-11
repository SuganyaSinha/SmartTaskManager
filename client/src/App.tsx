import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import './App.css';
import Home from './pages/Home';
import { withAuthenticationRequired } from '@auth0/auth0-react';
import { useApiToken } from './utilities/useApiToken';
import { setAuthTokenGetter } from './services/api';

import NavBar from './pages/NavBar';
import TaskScheduler from './pages/TaskScheduler';
import TaskCalendarView from './pages/TaskCalendarView';
import NewTask from './pages/NewTask';
import Callback from './pages/Callback';
import TaskPage from './pages/TaskPage';
import { UserRoutine } from './pages/UserRoutine';
import ProductivityPage from './pages/ProductivityPage';

const ProtectedNewTask = withAuthenticationRequired(NewTask);
const ProtectedTaskScheduler = withAuthenticationRequired(TaskScheduler);
const ProtectedTaskCalendarView = withAuthenticationRequired(TaskCalendarView);
const ProtectedTaskPage = withAuthenticationRequired(TaskPage);
const ProtectedUserRoutine = withAuthenticationRequired(UserRoutine);
const ProtectedProductivityPage = withAuthenticationRequired(ProductivityPage);

function AuthTokenSetup() {
  const { getToken } = useApiToken();
  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);
  return null;
}

function App() {
  return (
    <>
      <AuthTokenSetup />
      <div className="stm-app">
        <NavBar />
        <div className="stm-content">
          <Routes>
            {/* Public route */}
            <Route path="/" element={<Home />} />

            {/* Protected routes */}
            <Route path="/UserRoutine" element={<ProtectedUserRoutine />} />
            <Route path="/NewTask" element={<ProtectedNewTask />} />
            <Route path="/Calendar" element={<ProtectedTaskScheduler />} />
            <Route path="/CalendarNew" element={<ProtectedTaskCalendarView />} />
            <Route path="/Task" element={<ProtectedTaskPage />} />
            <Route path="/Productivity" element={<ProtectedProductivityPage />} />

            {/* Auth0 callback */}
            <Route path="/callback" element={<Callback />} />

            {/* Fallback */}
            <Route path="*" element={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>404 — Page not found</div>} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
