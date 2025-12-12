import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, History, Sun, CloudRain, Snowflake } from 'lucide-react';
import Papa from 'papaparse';
import './TramSimulation.css';

const TramSimulation = () => {
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({
    tramHeadway: 6, busCut: 20, passengerPeak: 4500, 
    costPerTramRun: 3500000, baseBusCostYear: 120000000000, operationHours: 18
  });
  const [weather, setWeather] = useState({ type: 'sunny', intensity: 0 });
  const [savedScenarios, setSavedScenarios] = useState([]);

  useEffect(() => {
    Papa.parse('/data/bus_budget.csv', { download: true, header: true, complete: (result) => {
      const row2024 = result.data.find(row => row['연도'] === '2024');
      if (row2024) setInputs(prev => ({ ...prev, baseBusCostYear: Number(row2024['시내버스_재정지원금_총액(원)']) }));
    }});
    Papa.parse('/data/metro_usage.csv', { download: true, header: true, complete: () => {} });
  }, []);

  const handleChange = (e) => setInputs(prev => ({ ...prev, [e.target.name]: Number(e.target.value) }));
  
  const results = useMemo(() => {
    const { tramHeadway, busCut, passengerPeak, costPerTramRun, baseBusCostYear, operationHours } = inputs;
    
    let speedFactor = 1.0;
    if (weather.type === 'rain') speedFactor = 1.0 - (weather.intensity / 100) * 0.2;
    else if (weather.type === 'snow') speedFactor = 1.0 - (weather.intensity / 100) * 0.5;
    
    const effectiveHeadway = tramHeadway / speedFactor;
    
    const tramRunsPerDay = Math.round((operationHours * 60) / effectiveHeadway);
    const tramCostYear = tramRunsPerDay * 365 * costPerTramRun;
    const busCostYear = baseBusCostYear * (1 - busCut / 100);
    const totalBudget = tramCostYear + busCostYear;
    const deltaBudget = totalBudget - baseBusCostYear;

    const capacityPerTram = 200;
    const peakCapacityPerHour = (60 / effectiveHeadway) * capacityPerTram;
    const congestionIndex = peakCapacityPerHour > 0 ? passengerPeak / peakCapacityPerHour : 0;
    const congestionPercent = congestionIndex * 100;
    
    const complaintScore = (busCut * 0.6) + (Math.max(0, congestionIndex - 0.9) * 100 * 0.4);

    let congestionInfo = { text: '', tagClass: '' };
    if (congestionIndex < 0.6) congestionInfo = { text: '여유 있음', tagClass: 'tag-success' };
    else if (congestionIndex < 0.9) congestionInfo = { text: '적정 수준', tagClass: 'tag-info' };
    else if (congestionIndex < 1.1) congestionInfo = { text: '주의 필요', tagClass: 'tag-warning' };
    else congestionInfo = { text: '매우 혼잡', tagClass: 'tag-danger' };

    let complaintInfo = { text: '', class1: '', tag1: '' };
    if (complaintScore < 20) complaintInfo = { text: '낮음', class1: 'tag-success', tag1: '안정' };
    else if (complaintScore < 40) complaintInfo = { text: '중간', class1: 'tag-warning', tag1: '주의' };
    else if (complaintScore < 60) complaintInfo = { text: '높음', class1: 'tag-warning', tag1: '경고' };
    else complaintInfo = { text: '매우 높음', class1: 'tag-danger', tag1: '위험' };

    let budgetTag = { text: '', class: '' };
    if (deltaBudget < 0) budgetTag = { text: '예산 절감', class: 'tag-success' };
    else if (deltaBudget < baseBusCostYear * 0.15) budgetTag = { text: '소폭 증가', class: 'tag-info' };
    else budgetTag = { text: '예산 부담 증가', class: 'tag-warning' };

    let strategyProposal = { title: '', actionItems: [], tone: '' };
    if (weather.type === 'snow' && weather.intensity > 60) {
      strategyProposal = { title: '❄️ 폭설 비상 대응', actionItems: ['트램 50% 감속 운행', '비상 수송 차량 투입'], tone: 'danger' };
    } else if (deltaBudget <= baseBusCostYear * 0.15 && congestionIndex >= 0.7 && congestionIndex <= 1.05) {
      strategyProposal = { title: '🌟 최적의 황금 정책', actionItems: ['현재 설정 유지 권장', '스마트 쉘터 구축 제안'], tone: 'positive' };
    } else if (congestionIndex > 1.2) {
      strategyProposal = { title: '🚨 혼잡도 위험', actionItems: ['배차 간격 단축 필요', '예비 차량 투입'], tone: 'danger' };
    } else {
      strategyProposal = { title: '⚖️ 정책 재조정 필요', actionItems: ['변수 미세 조정 권장'], tone: 'neutral' };
    }

    return { tramRunsPerDay, tramCostYear, busCostYear, totalBudget, deltaBudget, congestionPercent, congestionInfo, complaintScore, complaintInfo, strategyProposal, budgetTag, effectiveHeadway };
  }, [inputs, weather]);

  const handleSaveScenario = () => setSavedScenarios([{ id: Date.now(), time: new Date().toLocaleTimeString(), inputs: { ...inputs }, results: { ...results }, weather: {...weather} }, ...savedScenarios]);
  const formatWon = (num) => Math.round(num).toLocaleString('ko-KR') + '원';
  const formatPercent = (num) => num.toFixed(1) + '%';

  return (
    <div className="tram-simulation-container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        {/* ⭐ 여기가 수정된 부분입니다: /dashboard 로 이동 ⭐ */}
        <button onClick={() => navigate('/dashboard')} className="back-btn"><ArrowLeft size={18} /> 메인 지도로</button>
      </div>
      <div className="tram-layout">
        {/* 왼쪽: 날씨 및 입력 */}
        <div className="tram-card">
          <div className="weather-section">
            <div className="label-line">🌤️ 기상 조건 설정</div>
            <div className="weather-buttons">
              {['sunny', 'rain', 'snow'].map(type => (
                <button key={type} onClick={() => setWeather({ type, intensity: type === 'sunny' ? 0 : 50 })} className={`weather-btn ${weather.type === type ? 'active' : ''}`}>
                  {type === 'sunny' ? <Sun size={20}/> : type === 'rain' ? <CloudRain size={20}/> : <Snowflake size={20}/>}
                  {type === 'sunny' ? '맑음' : type === 'rain' ? '비' : '눈'}
                </button>
              ))}
            </div>
            {weather.type !== 'sunny' && (
              <div className="weather-intensity">
                <div className="label-line" style={{marginTop:'10px', fontSize:'13px'}}><span>강도</span><span style={{color:'#2563eb'}}>{weather.intensity}</span></div>
                <input type="range" min="10" max="100" step="10" value={weather.intensity} onChange={(e) => setWeather({...weather, intensity: Number(e.target.value)})} />
              </div>
            )}
          </div>
          <div className="divider"></div>
          <div className="card-title">1. 정책 변수 입력</div>
          <div className="card-subtitle">정책 및 환경 변수를 조정합니다.</div>
          <div className="form-row"><div className="label-line"><span>트램 배차 간격</span><span>{inputs.tramHeadway}분</span></div><div className="input-inline"><input type="range" name="tramHeadway" min="3" max="15" step="1" value={inputs.tramHeadway} onChange={handleChange} /></div></div>
          <div className="form-row"><div className="label-line"><span>버스 노선 감축률</span><span style={{ color: inputs.busCut >= 30 ? '#ef4444' : 'inherit' }}>{inputs.busCut}%</span></div><div className="input-inline"><input type="range" name="busCut" min="0" max="50" step="5" value={inputs.busCut} onChange={handleChange} /></div></div>
          <div className="form-row"><div className="label-line"><span>출근 승객</span></div><div className="input-inline"><input type="number" name="passengerPeak" value={inputs.passengerPeak} onChange={handleChange} /></div></div>
          <div className="form-row"><div className="label-line"><span>트램 1회 운행비</span></div><div className="input-inline"><input type="number" name="costPerTramRun" step="500000" value={inputs.costPerTramRun} onChange={handleChange} /></div></div>
          <div className="form-row"><div className="label-line"><span>버스 연간 운영비</span></div><div className="input-inline"><input type="number" name="baseBusCostYear" step="1000000000" value={inputs.baseBusCostYear} onChange={handleChange} /></div></div>
        </div>

        {/* 오른쪽: 결과 대시보드 */}
        <div className="tram-card">
          <div className="card-header-row"><div><div className="card-title">2. 시뮬레이션 결과</div><div className="card-subtitle">기상 악화 및 정책 반영 리포트</div></div><button onClick={handleSaveScenario} className="save-btn"><Save size={16} /> 시나리오 저장</button></div>
          <div className="results-grid">
            <div className="result-box"><div className="result-title">최종 소요 예산</div><div className="result-value">{formatWon(results.totalBudget)}</div><div className="result-sub">증감: {results.deltaBudget > 0 ? '+' : ''}{formatWon(results.deltaBudget)}</div><div className="pill-row"><div className={`pill ${results.budgetTag.class}`}>{results.budgetTag.text}</div></div></div>
            <div className="result-box"><div className="result-title">실질 혼잡도 (날씨 반영)</div><div className="result-value">{results.congestionInfo.text} ({formatPercent(results.congestionPercent)})</div><div className="traffic-bar-wrapper"><div className="traffic-bar-bg"><div className="traffic-bar-fill" style={{ width: `${Math.min(results.congestionPercent / 1.5, 100)}%` }}></div></div></div>{weather.type !== 'sunny' && <div className="weather-delay-msg">⚠️ 기상 악화로 배차 지연 중</div>}</div>
            <div className="result-box"><div className="result-title">시민 불편 지수</div><div className="result-value">{results.complaintInfo.text} ({results.complaintScore.toFixed(0)}점)</div><div className="pill-row"><div className={`pill ${results.complaintInfo.class1}`}>{results.complaintInfo.tag1}</div></div></div>
            <div className={`result-box strategy-box ${results.strategyProposal.tone}`}><div className="result-title">AI 정책 제안 보고서</div><div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>{results.strategyProposal.tone === 'danger' && <AlertTriangle size={20} color="#ef4444" />}<span style={{ fontSize: '15px', fontWeight: 'bold' }}>{results.strategyProposal.title}</span></div><ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', lineHeight: '1.5' }}>{results.strategyProposal.actionItems.map((item, idx) => (<li key={idx} style={{ marginBottom: '4px' }}>{item}</li>))}</ul><div className="eco-tag">🌲 <strong>환경 효과:</strong> 연간 소나무 {Math.round(results.tramRunsPerDay * 0.5).toLocaleString()}그루 식재</div></div>
          </div>
          <div className="section-title">3. 핵심 수치 요약</div>
          <table className="mini-table"><thead><tr><th>지표</th><th>값</th><th>비고</th></tr></thead><tbody><tr><td>일일 트램 운행</td><td>{results.tramRunsPerDay.toLocaleString()}회</td><td>배차 {inputs.tramHeadway}분</td></tr><tr><td>트램 연간 비용</td><td>{formatWon(results.tramCostYear)}</td><td>운행 비용 기반</td></tr><tr><td>버스 연간 비용</td><td>{formatWon(results.busCostYear)}</td><td>감축 {inputs.busCut}% 적용</td></tr></tbody></table>
          {savedScenarios.length > 0 && (<div className="history-section"><div className="section-title"><History size={16}/> 시나리오 비교 기록</div><div className="scenario-list">{savedScenarios.map((sc) => (<div key={sc.id} className="scenario-card"><div className="sc-header"><span className="sc-time">{sc.time}</span><span className="sc-badge">{sc.weather.type}</span></div><div className="sc-body"><div>배차: <strong>{sc.inputs.tramHeadway}분</strong></div><div>감축: <strong>{sc.inputs.busCut}%</strong></div><div className="sc-result">예산: {Math.round(sc.results.totalBudget / 100000000).toLocaleString()}억</div></div></div>))}</div></div>)}
        </div>
      </div>
    </div>
  );
};
export default TramSimulation;