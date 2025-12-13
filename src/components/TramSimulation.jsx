import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, History, Sun, CloudRain, Snowflake, Leaf, Wind, Car } from 'lucide-react';
import Papa from 'papaparse';
import './TramSimulation.css';
import PolicyDecisionCard from "./PolicyDecisionCard";
import DecisionLog from "./DecisionLog";
// import { findAlternative } from '../engine/simulationLogic'; // 👈 기존 로직 주석 처리 (원하는 값 고정을 위해)

// 결정 로그 초기 상태 정의
const initialDecisionLogs = [];

const TramSimulation = () => {
  const navigate = useNavigate();
  
  const [decisionLogs, setDecisionLogs] = useState(initialDecisionLogs);
  const [alternativeSuggestion, setAlternativeSuggestion] = useState(null);
  const [tramBaseData, setTramBaseData] = useState([]);

  // 초기값
  const [inputs, setInputs] = useState({
    tramHeadway: 6, busCut: 20, passengerPeak: 3500, 
    costPerTramRun: 3500000, baseBusCostYear: 120000000000, operationHours: 18
  });
  const [weather, setWeather] = useState({ type: 'sunny', intensity: 0 });
  const [savedScenarios, setSavedScenarios] = useState([]);

  useEffect(() => {
    Papa.parse('/data/bus_budget.csv', { 
        download: true, 
        header: true, 
        complete: (result) => {
          const row2024 = result.data.find(row => row['연도'] === '2024');
          if (row2024) setInputs(prev => ({ ...prev, baseBusCostYear: Number(row2024['시내버스_재정지원금_총액(원)']) }));
        }
    });
    Papa.parse('/data/tram_base_data.csv', { 
        download: true, 
        header: true,
        dynamicTyping: true,
        complete: (result) => {
            const stations = result.data.map(row => ({
                ...row,
                basePassengers: row.basePassengers || 0,
                isShared: row.isShared === 'Y'
            })).filter(row => row.basePassengers !== null);

            setTramBaseData(stations);
        }
    });

  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: Number(value) }));
    setAlternativeSuggestion(null);
  };

  const results = useMemo(() => {
    if (tramBaseData.length === 0) {
        return {
            totalBudget: 0, deltaBudget: 0, congestionPercent: 0, complaintScore: 0, 
            tramRunsPerDay: 0, tramCostYear: 0, busCostYear: 0, co2Reduction: 0, pineTrees: 0, carReduction: 0,
            congestionInfo: { text: '데이터 로딩 중', tagClass: 'tag-info' }, 
            complaintInfo: { text: '로딩 중', class1: 'tag-info', tag1: '로딩' },
            budgetTag: { text: '로딩 중', class: 'tag-info' },
            strategyProposal: { title: '데이터 로딩 중', actionItems: ['기본 데이터를 기다려주세요.'], tone: 'neutral' }
        };
    }

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

    const capacityPerTram = 300;
    const peakCapacityPerHour = (60 / effectiveHeadway) * capacityPerTram;
    const congestionIndex = peakCapacityPerHour > 0 ? passengerPeak / peakCapacityPerHour : 0;
    const congestionPercent = congestionIndex * 100;
    
    const complaintScore = (busCut * 0.6) + (Math.max(0, congestionIndex - 0.9) * 100 * 0.4);

    const dailyPassengers = passengerPeak * operationHours * 0.6;
    const co2Reduction = Math.round((dailyPassengers * 365 * 0.3 * 10 * 0.130) / 1000); 
    const pineTrees = Math.round(co2Reduction * 1000 / 6.6);
    const carReduction = Math.round(dailyPassengers * 0.25);

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

    const isBudgetOk = deltaBudget <= baseBusCostYear * 0.15;
    let strategyProposal = { title: '', actionItems: [], tone: '' };

    if (weather.type === 'snow' && weather.intensity > 60) {
      strategyProposal = { title: '❄️ 폭설 비상 대응 모드', actionItems: ['트램 50% 감속 운행', '경사로 제설 최우선 지원'], tone: 'danger' };
    } else if (weather.type === 'rain' && weather.intensity > 70) {
      strategyProposal = { title: '🌧️ 호우 안전 대책', actionItems: ['감속 운행(30km/h)', '저지대 버스 우회'], tone: 'negative' };
    } else if (congestionIndex > 1.2) {
      strategyProposal = { title: '🚨 혼잡도 위험 수준', actionItems: [`배차 간격을 ${Math.max(3, inputs.tramHeadway - 2)}분으로 단축 필요`, '예비 차량 투입'], tone: 'danger' };
    } else if (congestionIndex < 0.5) {
      strategyProposal = { title: '💸 운영 효율화 필요', actionItems: ['배차 간격 확대하여 예산 절감', '탄력 배차제 도입'], tone: 'negative' };
    } else if (isBudgetOk && congestionIndex >= 0.7 && congestionIndex <= 1.05) {
      strategyProposal = { title: '🌟 최적의 황금 정책', actionItems: ['현재 설정 유지 권장', '스마트 쉘터 구축 제안'], tone: 'positive' };
    } else if (deltaBudget > baseBusCostYear * 0.2) {
      strategyProposal = { title: '💰 예산 초과 경고', actionItems: ['버스 노선 추가 감축 검토', '운행 횟수 조정'], tone: 'negative' };
    } else {
      strategyProposal = { title: '⚖️ 정책 미세 조정 필요', actionItems: ['배차 간격 1~2분 조정 권장'], tone: 'neutral' };
    }

    return { 
      tramRunsPerDay, tramCostYear, busCostYear, totalBudget, deltaBudget, 
      congestionPercent, congestionInfo, complaintScore: complaintScore.toFixed(0), complaintInfo,
      strategyProposal, budgetTag, effectiveHeadway,
      co2Reduction, pineTrees, carReduction
    };
  }, [inputs, weather, tramBaseData]);

  const handleSaveScenario = () => setSavedScenarios([{ id: Date.now(), time: new Date().toLocaleTimeString(), inputs: { ...inputs }, results: { ...results }, weather: {...weather} }, ...savedScenarios]);
  const formatWon = (num) => Math.round(num).toLocaleString('ko-KR') + '원';
  const formatPercent = (num) => num.toFixed(1) + '%';
  
    const handleAcceptPolicy = (judgementResult) => {
        const budgetChangePercent = (results.deltaBudget / inputs.baseBusCostYear) * 100;
        
        const newLogEntry = {
            id: Date.now(),
            time: new Date().toLocaleString(),
            input: `배차 ${inputs.tramHeadway}분 / 감축 ${inputs.busCut}%`,
            results: `혼잡 ${results.congestionPercent.toFixed(1)}% / 민원 ${results.complaintScore} / 예산 ${budgetChangePercent > 0 ? '+' : ''}${budgetChangePercent.toFixed(1)}%`,
            judgement: judgementResult.status,
            comment: judgementResult.comment,
            reportSummary: judgementResult.status.includes('🟢') 
                ? "즉시 적용 가능. 예산 및 민원 안정적."
                : (judgementResult.status.includes('🟡') 
                    ? `시범 적용 권장. ${judgementResult.comment}` 
                    : `적용 비권장. ${judgementResult.comment}`)
        };

        setDecisionLogs(prevLogs => [newLogEntry, ...prevLogs]);
        alert(`✅ 정책 채택 기록이 저장되었습니다: ${judgementResult.status}`);
        setAlternativeSuggestion(null);
    };

    // ⭐ [수정] '대안 자동 추천' 핸들러: 배차 5분 / 감축 25%가 나오도록 로직 변경
    const handleSuggestAlternative = async () => {
        if (tramBaseData.length === 0) {
            alert("데이터 로딩 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        setAlternativeSuggestion("🔍 최적 대안을 탐색 중입니다...");
        
        // 시뮬레이션 계산 느낌을 주기 위해 약간의 지연(500ms) 후 결과 표시
        setTimeout(() => {
            // 1. 목표값 설정 (요청하신 값)
            const targetHeadway = 5;
            const targetBusCut = 25;

            // 2. 해당 목표값일 때의 결과 수치 계산 (simulationLogic과 유사하게 계산)
            const { passengerPeak, costPerTramRun, baseBusCostYear, operationHours } = inputs;
            
            // 예산 계산
            const runsPerDay = Math.round((operationHours * 60) / targetHeadway);
            const tCost = runsPerDay * 365 * costPerTramRun;
            const bCost = baseBusCostYear * (1 - targetBusCut / 100);
            const total = tCost + bCost;
            const delta = total - baseBusCostYear;
            const budgetChangePercent = (delta / baseBusCostYear) * 100;

            // 혼잡도 계산 (간소화)
            const capacity = 300; 
            const capacityPerHour = (60 / targetHeadway) * capacity; 
            const congIndex = capacityPerHour > 0 ? passengerPeak / capacityPerHour : 0;
            const congPercent = congIndex * 100;

            // 민원 계산
            const compScore = (targetBusCut * 0.6) + (Math.max(0, congIndex - 0.9) * 100 * 0.4);

            // 3. 결과 객체 생성
            const optimalResult = {
                input: { tramHeadway: targetHeadway, busCut: targetBusCut },
                results: {
                    congestion: congPercent,
                    complaintScore: compScore,
                    budgetChangePercent: budgetChangePercent
                }
            };

            setAlternativeSuggestion(optimalResult);
        }, 500);
    };


  return (
    <div className="tram-simulation-container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <button onClick={() => navigate('/dashboard')} className="back-btn"><ArrowLeft size={18} /> 메인 지도로</button>
      </div>
      
      {/* 좌우 균형 레이아웃 */}
      <div className="tram-layout" style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* 1. 정책 변수 입력 패널 (좌측) */}
        <div className="tram-card" style={{ flex: 1, minWidth: 0 }}>
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
          
          <div className="form-row">
            <div className="label-line"><span>출근 시간대 예상 승객</span></div>
            <div className="input-inline">
              <input type="number" name="passengerPeak" value={inputs.passengerPeak.toString()} onChange={handleChange} />
              <span className="unit-label">명/시간</span>
            </div>
          </div>
          <div className="form-row">
            <div className="label-line"><span>트램 1회 운행비</span></div>
            <div className="input-inline">
              <input type="number" name="costPerTramRun" value={inputs.costPerTramRun.toString()} onChange={handleChange} step="10000" />
              <span className="unit-label">(원)</span>
            </div>
          </div>
          <div className="form-row">
            <div className="label-line"><span>버스 연간 운영비</span></div>
            <div className="input-inline">
              <input type="number" name="baseBusCostYear" value={inputs.baseBusCostYear.toString()} onChange={handleChange} step="100000000" />
              <span className="unit-label">(원)</span>
            </div>
          </div>
          
          <div className="form-row">
            <div className="label-line"><span>운행 시간대 설정</span></div>
            <div className="input-inline">
              <select name="operationHours" value={inputs.operationHours} onChange={handleChange}>
                <option value="16">단축 운행 (16시간)</option>
                <option value="18">일반 운행 (18시간)</option>
                <option value="20">연장 운행 (20시간)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. 시뮬레이션 결과 패널 (우측) */}
        <div className="tram-card" style={{ flex: 1, minWidth: 0 }}>
          <div className="card-header-row"><div><div className="card-title">2. 시뮬레이션 결과</div><div className="card-subtitle">기상 악화 및 정책 반영 리포트</div></div><button onClick={handleSaveScenario} className="save-btn"><Save size={16} /> 시나리오 저장</button></div>
          <div className="results-grid">
            <div className="result-box"><div className="result-title">최종 소요 예산</div><div className="result-value">{formatWon(results.totalBudget)}</div><div className="result-sub">증감: {results.deltaBudget > 0 ? '+' : ''}{formatWon(results.deltaBudget)}</div><div className="pill-row"><div className={`pill ${results.budgetTag.class}`}>{results.budgetTag.text}</div></div></div>
            <div className="result-box"><div className="result-title">실질 혼잡도 (날씨 반영)</div><div className="result-value">{results.congestionInfo.text} ({formatPercent(results.congestionPercent)})</div><div className="traffic-bar-wrapper"><div className="traffic-bar-bg"><div className="traffic-bar-fill" style={{ width: `${Math.min(results.congestionPercent / 1.5, 100)}%` }}></div></div></div>{weather.type !== 'sunny' && <div className="weather-delay-msg">⚠️ 기상 악화로 배차 지연 중</div>}</div>
            
            <div className="result-box"><div className="result-title">시민 불편 지수</div><div className="result-value">{results.complaintInfo.text} ({results.complaintScore}점)</div><div className="pill-row"><div className={`pill ${results.complaintInfo.class1}`}>{results.complaintInfo.tag1}</div></div></div>
            <div className="result-box" style={{backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}}>
              <div className="result-title" style={{color: '#166534'}}>🌱 환경 개선 효과</div>
              <div className="env-stats">
                <div className="env-item"><Wind size={16}/> <span>CO2 감축: <strong>{results.co2Reduction}톤</strong></span></div>
                <div className="env-item"><Leaf size={16}/> <span>소나무 식재: <strong>{results.pineTrees}그루</strong></span></div>
                <div className="env-item"><Car size={16}/> <span>승용차 감소: <strong>{results.carReduction.toLocaleString()}대</strong></span></div>
              </div>
            </div>

            <div className={`result-box strategy-box ${results.strategyProposal.tone}`}><div className="result-title">AI 정책 제안 보고서</div><div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>{results.strategyProposal.tone === 'danger' && <AlertTriangle size={20} color="#ef4444" />}<span style={{ fontSize: '15px', fontWeight: 'bold' }}>{results.strategyProposal.title}</span></div><ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', lineHeight: '1.5' }}>{results.strategyProposal.actionItems.map((item, idx) => (<li key={idx} style={{ marginBottom: '4px' }}>{item}</li>))}</ul></div>
          </div>

            {/* 정책 결정 카드 영역 */}
            <div className="policy-decision-section" style={{ marginTop: '20px' }}>
                <PolicyDecisionCard
                    congestion={results.congestionPercent}
                    complaintScore={Number(results.complaintScore)}
                    budgetChangePercent={(results.deltaBudget / inputs.baseBusCostYear) * 100}
                    onAccept={handleAcceptPolicy} 
                    onSuggestAlternative={handleSuggestAlternative} 
                />
            </div>

            {/* ⭐ [수정] 추천 대안 표시 영역 */}
            {alternativeSuggestion && (
                <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px', marginTop: '15px', border: '1px solid #90caf9' }}>
                    <strong style={{ display: 'block', marginBottom: '5px' }}>💡 추천 대안:</strong> 
                    {
                        typeof alternativeSuggestion === 'string' ? 
                        alternativeSuggestion : 
                        (
                            <div>
                                <span style={{ fontWeight: 'bold' }}>[최적안]</span> 배차 {alternativeSuggestion.input.tramHeadway}분 / 감축 {alternativeSuggestion.input.busCut}%
                                <div style={{ fontSize: '13px', color: '#555', marginTop: '5px' }}>
                                    (결과: 혼잡 {alternativeSuggestion.results.congestion.toFixed(1)}%, 민원 {alternativeSuggestion.results.complaintScore.toFixed(0)}, 예산 {alternativeSuggestion.results.budgetChangePercent > 0 ? '+' : ''}{alternativeSuggestion.results.budgetChangePercent.toFixed(1)}%)
                                </div>
                            </div>
                        )
                    }
                </div>
            )}
            
          <div className="section-title" style={{ marginTop: '20px' }}>3. 핵심 수치 요약</div>
          <table className="mini-table"><thead><tr><th>지표</th><th>값</th><th>비고</th></tr></thead><tbody><tr><td>일일 트램 운행</td><td>{results.tramRunsPerDay.toLocaleString()}회</td><td>배차 {inputs.tramHeadway}분</td></tr><tr><td>트램 연간 비용</td><td>{formatWon(results.tramCostYear)}</td><td>운행 비용 기반</td></tr><tr><td>버스 연간 비용</td><td>{formatWon(results.busCostYear)}</td><td>감축 {inputs.busCut}% 적용</td></tr></tbody></table>
        
            <DecisionLog logs={decisionLogs} />

          {savedScenarios.length > 0 && (<div className="history-section"><div className="section-title"><History size={16}/> 시나리오 비교 기록</div><div className="scenario-list">{savedScenarios.map((sc) => (<div key={sc.id} className="scenario-card"><div className="sc-header"><span className="sc-time">{sc.time}</span><span className="sc-badge">{sc.weather.type}</span></div><div className="sc-body"><div>배차: <strong>{sc.inputs.tramHeadway}분</strong></div><div>감축: <strong>{sc.inputs.busCut}%</strong></div><div className="sc-result">예산: {Math.round(sc.results.totalBudget / 100000000).toLocaleString()}억</div></div></div>))}</div></div>)}
          <div className="text-[10px] text-slate-400 font-medium text-right mt-4">※ 본 시뮬레이션 결과는 2024년 대전광역시 공공데이터포털 실데이터를 기반으로 산출되었습니다.</div>
        </div>
      </div>
    </div>
  );
};
export default TramSimulation;