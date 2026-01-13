import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import { withAuthenticationRequired } from '@auth0/auth0-react';

import NavBar from './pages/NavBar';
import TaskScheduler from './pages/TaskScheduler';
import NotFound from './pages/NotFound';
import NewTask from './pages/NewTask';
import Callback from './pages/Callback';

const ProtectedNewTask = withAuthenticationRequired(NewTask);
const ProtectedTaskScheduler = withAuthenticationRequired(TaskScheduler);

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        {/* Public route – anyone can access */}
        <Route path="/" element={<Home />} />

        {/* Protected routes – require login */}
        <Route
          path="/NewTask"
          element={<ProtectedNewTask />}
        />
        <Route
          path="/Calendar"
          element={<ProtectedTaskScheduler />}
        />

        {/* Optional: Handle Auth0 callback explicitly */}
        <Route path="/callback" element={<Callback />} />

        {/* Fallback */}
        <Route path="*" element={<div>404 - Not Found</div>} />
      </Routes>
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
