import React, { useEffect, useState } from 'react';

const SplashScreen = ({ finishLoading }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // 2.5초 뒤에 페이드 아웃 시작
    const timer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2500);

    // 3초 뒤에 완전히 끔
    const cleanup = setTimeout(() => {
      finishLoading();
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(cleanup);
    };
  }, [finishLoading]);

  return (
    <div style={{
      ...styles.container,
      opacity: isFadingOut ? 0 : 1,
      pointerEvents: isFadingOut ? 'none' : 'auto', // 페이드아웃 중엔 클릭 통과
    }}>
      <div style={styles.logoContainer}>
        {/* 로고 이미지 경로 확인 필수: public/logo.png */}
        <img 
          src="/logo.png" 
          alt="트램ON" 
          style={styles.logoImage} 
        />
        <div style={styles.loadingBarContainer}>
          <div style={styles.loadingBar}></div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed', // 화면에 고정
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#ffffff', // 배경 흰색
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999, // ⭐ 가장 높은 우선순위로 덮음
    transition: 'opacity 0.5s ease-out',
  },
  logoContainer: {
    textAlign: 'center',
    animation: 'fadeInUp 1s ease-out forwards',
  },
  logoImage: {
    width: '250px', // 로고 크기 살짝 키움
    marginBottom: '30px',
    display: 'block', // 이미지 깨짐 방지
    margin: '0 auto 30px auto'
  },
  loadingBarContainer: {
    width: '150px',
    height: '4px',
    backgroundColor: '#eee',
    borderRadius: '2px',
    margin: '0 auto',
    overflow: 'hidden',
  },
  loadingBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0042ED',
    borderRadius: '2px',
    animation: 'loading 2.5s ease-in-out',
  }
};

// CSS 애니메이션 주입
if (!document.getElementById('splash-style')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'splash-style';
  styleSheet.innerText = `
    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(20px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes loading {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default SplashScreen;