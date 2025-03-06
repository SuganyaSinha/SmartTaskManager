import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react';

const Callback = () => {
  const { handleRedirectCallback } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    handleRedirectCallback().then(() => navigate('/dashboard'));
  }, [handleRedirectCallback, navigate]);

  return (  <div>Loading...</div>);
};
export default Callback;