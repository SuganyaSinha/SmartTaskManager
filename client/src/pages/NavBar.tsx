import React from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import TaskManager from './TaskManager';
import TaskScheduler from './TaskScheduler';
import AudioInput from './AudioInput';
import { Routes, Route } from 'react-router-dom';
import { Link } from 'react-router-dom';


const NavBar = () => {
    const { logout, isAuthenticated, loginWithRedirect, user , isLoading} = useAuth0();

    if (isLoading) return <div>Loading...</div>;
    /*
 const { logout } = useAuth0();
 const { isAuthenticated } = useAuth0();
 const { loginWithRedirect } = useAuth0();
 const { user } = useAuth0(); // Ensure this is inside a functional component */


  return (
    //  <nav>
    //   <ul>
    //     {/* Public or always-visible links */}
    //     <li><Link to="/">Home</Link></li>

    //     {/* Private links – shown only if authenticated */}
    //     {isAuthenticated && (
    //       <>
    //         <li><Link to="/NewTask">Add new task</Link></li>
    //         <li><Link to="/Calendar">Calendar view</Link></li>
    //       </>
    //     )}
    //   </ul>

    //   <div>
    //     {isAuthenticated ? (
    //       <>
    //         <span>Welcome, {user?.name}</span>
    //         <button
    //           onClick={() =>
    //             logout({ logoutParams: { returnTo: window.location.origin } })
    //           }
    //         >
    //           Log Out
    //         </button>
    //       </>
    //     ) : (
    //       <button onClick={() => loginWithRedirect()}>Log In</button>
    //     )}
    //   </div>
    // </nav>
    <div>
        
      {!isAuthenticated ? (
        <div>
        <button onClick={() => loginWithRedirect()}>Login</button>
        <Link to="/">Home</Link>
        </div>

      ) : (
        <div>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Logout
          </button>
          <h2>Hi {user?.name}!</h2>
                      <div>
              <table>
                  <tr><td><Link to="/">Home</Link></td></tr>
                  <tr><td><Link to="/Task">Task</Link></td></tr>
                  <tr><td><Link to="/NewTask">Add new task</Link></td></tr>
                  <tr><td><Link to="/Calendar">Calendar view</Link></td></tr>
              </table>
            </div>

        </div>
      )}
    </div>

  );

};

export default NavBar;
