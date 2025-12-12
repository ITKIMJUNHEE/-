import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';           // ⭐ 새로 만든 로그인 페이지
import MainDashboard from './MainDashboard';   // 메인 지도
import TramSimulation from './components/TramSimulation'; // 시뮬레이션

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 접속하면 가장 먼저 뜨는 페이지 (로그인) */}
        <Route path="/" element={<LoginPage />} />
        
        {/* 2. 로그인 성공 시 이동하는 메인 지도 */}
        <Route path="/dashboard" element={<MainDashboard />} />
        
        {/* 3. 상세 시뮬레이션 페이지 */}
        <Route path="/simulation" element={<TramSimulation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;