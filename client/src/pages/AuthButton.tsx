import React from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import TaskManager from './TaskManager';
import TaskScheduler from './TaskScheduler';

const AuthButtons = () => {
    const { logout, isAuthenticated, loginWithRedirect, user , isLoading} = useAuth0();
    /*
 const { logout } = useAuth0();
 const { isAuthenticated } = useAuth0();
 const { loginWithRedirect } = useAuth0();
 const { user } = useAuth0(); // Ensure this is inside a functional component */


  return (
    <div>
        
      {!isAuthenticated ? (
        <button onClick={() => loginWithRedirect()}>Login</button>
      ) : (
        <div>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Logout
          </button>
          <h2>Hi {user?.name}!</h2>
          <>
          <TaskScheduler/>
          </>
        </div>
      )}
    </div>

  );

};

export default AuthButtons;
