/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminStudioPage } from './components/AdminStudioPage';
import { ShowcasePage } from './components/ShowcasePage';
import { ToastContainer } from './components/ToastContainer';
import { SiteProvider, useSite } from './context/SiteContext';

const AppRouter: React.FC = () => {
  const { route } = useSite();

  return (
    <>
      {route === '/adminlogin' ? (
        <AdminLoginPage />
      ) : route === '/admin' ? (
        <AdminStudioPage />
      ) : (
        <ShowcasePage />
      )}
      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <SiteProvider>
      <AppRouter />
    </SiteProvider>
  );
}
