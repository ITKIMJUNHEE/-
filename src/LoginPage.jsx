import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';
import './LoginPage.css'; // 스타일 파일

const LoginPage = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ id: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // 간단한 로그인 로직 (실제로는 서버 인증 필요)
    // 여기서는 ID에 'admin'만 입력하면 통과되게 설정 (테스트용)
    if (credentials.id === 'admin') {
      navigate('/dashboard'); // 메인 대시보드로 이동
    } else {
      setError('접근 권한이 없는 계정입니다. 관리자에게 문의하세요.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-overlay"></div>
      
      {/* 중앙 로그인 박스 */}
      <div className="login-box">
        <div className="login-header">
          <div className="logo-area">
            <ShieldCheck size={40} className="logo-icon" />
            <div className="logo-text">
              <h1>대전 트램 정책 지원 시스템</h1>
              <p>Daejeon Tram Policy Support System</p>
            </div>
          </div>
          <div className="header-badge">행정망 전용</div>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>행정 ID</label>
            <div className="input-wrapper">
              <User size={20} />
              <input 
                type="text" 
                name="id" 
                placeholder="아이디를 입력하세요 (admin)" 
                value={credentials.id}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-group">
            <label>비밀번호</label>
            <div className="input-wrapper">
              <Lock size={20} />
              <input 
                type="password" 
                name="password" 
                placeholder="비밀번호를 입력하세요" 
                value={credentials.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && <div className="error-msg"><AlertCircle size={14}/> {error}</div>}

          <button type="submit" className="login-btn">로그인</button>
          
          <div className="divider">
            <span>또는</span>
          </div>

          {/* GPKI 인증 버튼 (디자인용) */}
          <button type="button" className="gpki-btn" onClick={() => alert("GPKI 인증 모듈을 로딩합니다...")}>
            <ShieldCheck size={16} /> GPKI 공인인증서 로그인
          </button>
        </form>

        <div className="login-footer">
          <p>※ 본 시스템은 인가된 담당자만 이용 가능합니다.</p>
          <p>불법 접속 시 정보통신망법에 의해 처벌될 수 있습니다.</p>
          <div className="copyright">Copyright © DAEJEON METROPOLITAN CITY. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;