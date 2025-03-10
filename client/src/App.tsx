import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import About from './pages/About';
import TaskManager from './pages/TaskManager';
import { Auth0Provider } from "@auth0/auth0-react";

import AuthButtons from './pages/AuthButton';
import TaskScheduler from './pages/TaskScheduler';


function Navigation() {
  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/About">About</Link></li>
        <li><Link to="/TaskManager">Task Manager</Link></li>
      </ul>
    </nav>
  );
}

function App() {
  return (
   
    /*
    <Router>
      <Navigation />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/About" element={<About />} />
      <Route path="/TaskManager" element={<TaskManager />} />
    </Routes>
  </Router>
  */
 /*
  <Auth0Provider
  domain={process.env.REACT_APP_DOMAIN!}
  clientId={process.env.REACT_APP_CLIENT_ID!}
  authorizationParams={{
    redirect_uri: window.location.origin,
    audience : process.env.REACT_APP_AUDIENCE,
    scope: "openid profile email"
  }}
>
  <AuthButtons></AuthButtons>

</Auth0Provider>
*/
<TaskScheduler></TaskScheduler>
  );
}

export default App;
