import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import { withAuthenticationRequired } from '@auth0/auth0-react';
import { useApiToken } from './utilities/useApiToken';
import { setAuthTokenGetter } from './services/api';

import NavBar from './pages/NavBar';
import TaskScheduler from './pages/TaskScheduler';
import TaskCalendarView from './pages/TaskCalendarView';
import NotFound from './pages/NotFound';
import NewTask from './pages/NewTask';
import Callback from './pages/Callback';
import TaskPage from './pages/TaskPage';
import TaskDetail from './pages/TaskDetail';
import {UserRoutine} from './pages/UserRoutine';

const ProtectedNewTask = withAuthenticationRequired(NewTask);
const ProtectedTaskScheduler = withAuthenticationRequired(TaskScheduler);
const ProtectedTaskCalendarView = withAuthenticationRequired(TaskCalendarView);
const ProtectedTaskPage = withAuthenticationRequired(TaskPage);
const ProtectedTaskDetail = withAuthenticationRequired(TaskDetail);
const ProtectedUserRoutine = withAuthenticationRequired(UserRoutine);

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

<div style={{display: "flex"}}>
    <div style={{width: "10%", flexBasis : ""}}>
       <NavBar />
    </div>
    <div style={{width: "90%", flexBasis: "90%"}}>
     
      <Routes>
        {/* Public route – anyone can access */}
        <Route path="/" element={<Home />} />

        {/* Protected routes – require login */}
        <Route
          path="/UserRoutine"
          element={<ProtectedUserRoutine />}
        />
        <Route
          path="/NewTask"
          element={<ProtectedNewTask />}
        />
        <Route
          path="/Calendar"
          element={<ProtectedTaskScheduler />}
        />
        <Route
          path="/CalendarNew"
          element={<ProtectedTaskCalendarView />}
        />

          <Route
          path="/Task"
          element={<ProtectedTaskPage />}
        />

        <Route
          path="/tasks/:id"
          element={<ProtectedTaskDetail />}
        />

        {/* Optional: Handle Auth0 callback explicitly */}
        <Route path="/callback" element={<Callback />} />

        {/* Fallback */}
        <Route path="*" element={<div>404 - Not Found</div>} />
      </Routes>
      </div>
      </div>
    </>


//   <Auth0Provider
//   domain={process.env.REACT_APP_DOMAIN!}
//   clientId={process.env.REACT_APP_CLIENT_ID!}
//   authorizationParams={{
//     redirect_uri: window.location.origin,
//     audience : process.env.REACT_APP_AUDIENCE,
//     scope: "openid profile email"
//   }}
//   cacheLocation="localstorage"
//   useRefreshTokens={true}
// >
//   <AuthButtons></AuthButtons>

// </Auth0Provider>

/*<TaskScheduler></TaskScheduler>*/
// {/* <div>
//       <h1>Smart Task Manager</h1>
//           <div>

//           </div>
//           <Routes>
//             <Route path="/" element={<Home />} />  // Home route
//         <Route path="/NewTask" element={<NewTask />} />  // Home route
//         <Route path="/Calendar" element={<TaskScheduler />} />  // About route
//         <Route path="*" element={<NotFound />} />  // Catch-all for 404
//       </Routes>
//     </div> */}
  );
}

export default App;
