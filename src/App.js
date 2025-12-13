import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import MainDashboard from './MainDashboard';
import TramSimulation from './components/TramSimulation';
import TramPredictionMap from './components/TramPredictionMap';
import SplashScreen from './components/SplashScreen';

function App() {
  // 스플래시 화면 상태 (처음엔 무조건 true)
  const [showSplash, setShowSplash] = useState(true);

  // 디버깅용: 콘솔에서 상태 확인
  useEffect(() => {
    console.log("현재 스플래시 상태:", showSplash);
  }, [showSplash]);

  return (
    <BrowserRouter>
      {/* ⭐ [핵심 변경] 
         라우터와 상관없이 showSplash가 true면 
         무조건 화면 맨 위에 덮어씌웁니다.
      */}
      {showSplash && (
        <SplashScreen finishLoading={() => setShowSplash(false)} />
      )}

      {/* 뒤에는 앱 화면들이 미리 로딩되어 있음 */}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/simulation" element={<TramSimulation />} />
        <Route path="/prediction" element={<TramPredictionMap />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;