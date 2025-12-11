import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainDashboard from './MainDashboard';
import TramSimulation from './components/TramSimulation';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/simulation" element={<TramSimulation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;