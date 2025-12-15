import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, History, Sun, CloudRain, Snowflake, Leaf, Wind, Car, CheckCircle, TrendingUp, AlertCircle, FileText, Calculator, BadgeCheck, Lightbulb, X, BarChart3, List } from 'lucide-react';
import Papa from 'papaparse';
import './TramSimulation.css';
import DecisionLog from "./DecisionLog";

const initialDecisionLogs = [];

const TramSimulation = () => {
  const navigate = useNavigate();
  
  // 모달 상태 관리 ('ai' | 'history' | null)
  const [activeModal, setActiveModal] = useState(null);

  const [decisionLogs, setDecisionLogs] = useState(initialDecisionLogs);
  const [alternativeSuggestion, setAlternativeSuggestion] = useState(null);
  const [tramBaseData, setTramBaseData] = useState([]);

  // 초기 기본값
  const [inputs, setInputs] = useState({
    tramHeadway: 6, 
    busCut: 20, 
    passengerPeak: 2500, 
    costPerTramRun: 3500000, 
    baseBusCostYear: 120000000000, 
    operationHours: 18
  });
  
  const [weather, setWeather] = useState({ type: 'sunny', intensity: 0 });
  const [savedScenarios, setSavedScenarios] = useState([]);

  useEffect(() => {
    Papa.parse('/data/bus_budget.csv', { 
        download: true, header: true, 
        complete: (result) => {
          const row2024 = result.data.find(row => row['연도'] === '2024');
          if (row2024) setInputs(prev => ({ ...prev, baseBusCostYear: Number(row2024['시내버스_재정지원금_총액(원)']) }));
        }
    });
    Papa.parse('/data/tram_base_data.csv', { 
        download: true, header: true, dynamicTyping: true,
        complete: (result) => {
            const stations = result.data.map(row => ({ ...row, basePassengers: row.basePassengers || 0, isShared: row.isShared === 'Y' })).filter(row => row.basePassengers !== null);
            setTramBaseData(stations);
        }
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: Number(value) }));
    setAlternativeSuggestion(null);
  };

  // ⭐ [수정됨] 날씨 변경 핸들러 (비 클릭 시 시연용 값 자동 설정)
  const handleWeatherChange = (type) => {
    setWeather({ type, intensity: type === 'sunny' ? 0 : 50 });

    // 🎥 시연 시나리오: 비가 오면 배차 8분, 감축 25%로 자동 세팅
    if (type === 'rain') {
        setInputs(prev => ({
            ...prev,
            tramHeadway: 8,
            busCut: 25
        }));
    }
  };

  // 결과 계산 로직
  const results = useMemo(() => {
    // 초기 로딩 상태 안전 처리
    if (tramBaseData.length === 0) return { 
        totalBudget: 0, deltaBudget: 0, congestionPercent: 0, complaintScore: 0, tramRunsPerDay: 0, tramCostYear: 0, busCostYear: 0, co2Reduction: 0, pineTrees: 0, carReduction: 0,
        congestionInfo: { text: '로딩 중', tagClass: 'tag-info', color: '#94a3b8' }, complaintInfo: { text: '로딩 중', class1: 'tag-info', tag1: '로딩' }, budgetTag: { text: '로딩 중', class: 'tag-info' }, strategyProposal: { title: '로딩 중', actionItems: [], tone: 'neutral' },
        headwayWeekend: 0, headwayPeak: 0, effectiveHeadway: 0
    };

    const { tramHeadway, busCut, passengerPeak, costPerTramRun, baseBusCostYear, operationHours } = inputs;
    
    let speedFactor = 1.0;
    if (weather.type === 'rain') speedFactor = 1.0 - (weather.intensity / 100) * 0.4;
    else if (weather.type === 'snow') speedFactor = 1.0 - (weather.intensity / 100) * 0.6;
    speedFactor = Math.max(speedFactor, 0.3);

    const effectiveHeadway = tramHeadway / speedFactor;
    
    const runsWeekday = (operationHours * 60) / effectiveHeadway;
    const costWeekdayTotal = runsWeekday * 245 * costPerTramRun;
    const headwayWeekend = effectiveHeadway * 1.5;
    const runsWeekend = (operationHours * 60) / headwayWeekend;
    const costWeekendTotal = runsWeekend * 110 * costPerTramRun;
    const headwayPeak = effectiveHeadway * 0.8;
    const runsPeak = (operationHours * 60) / headwayPeak;
    const costPeakTotal = runsPeak * 10 * costPerTramRun;

    const tramCostYear = Math.round(costWeekdayTotal + costWeekendTotal + costPeakTotal);
    const tramRunsPerDay = Math.round(runsWeekday); 

    const busCostYear = baseBusCostYear * (1 - busCut / 100);
    const totalBudget = tramCostYear + busCostYear;
    const deltaBudget = totalBudget - baseBusCostYear;

    const MAX_CAPACITY_REFERENCE = 5000; 
    const headwayPenalty = effectiveHeadway / 6; 
    const adjustedPassengerLoad = passengerPeak * headwayPenalty;
    const rawCongestion = (adjustedPassengerLoad / MAX_CAPACITY_REFERENCE) * 100;
    const congestionPercent = Math.min(rawCongestion, 100);
    
    // ⭐ [수정됨] 시민 불편 지수 (민원) 로직 고도화 (100점 만점 기준)
    // 버스 감축(최대 50점) + 혼잡도(최대 50점) 비중으로 합산
    // 혼잡도가 높으면 불편 지수도 같이 올라가도록 수정함
    let rawComplaintScore = (busCut * 1.0) + (congestionPercent * 0.5);
    
    // 혼잡도가 100%를 넘으면 추가 페널티 부여
    if (rawCongestion > 100) rawComplaintScore += 10;
    
    const complaintScore = Math.min(rawComplaintScore, 100); // 100점 넘지 않게 Cap

    const dailyPassengers = passengerPeak * operationHours * 0.6;
    const co2Reduction = Math.round((dailyPassengers * 365 * 0.3 * 10 * 0.130) / 1000); 
    const pineTrees = Math.round(co2Reduction * 1000 / 6.6);
    const carReduction = Math.round(dailyPassengers * 0.25);

    let congestionInfo = { text: '', tagClass: '', color: '' };
    if (congestionPercent < 50) congestionInfo = { text: '여유 있음', tagClass: 'tag-success', color: '#22c55e' };
    else if (congestionPercent < 80) congestionInfo = { text: '적정 수준', tagClass: 'tag-info', color: '#3b82f6' };
    else if (congestionPercent < 99) congestionInfo = { text: '주의 필요', tagClass: 'tag-warning', color: '#f59e0b' };
    else congestionInfo = { text: '최대 수용 초과', tagClass: 'tag-danger', color: '#ef4444' };

    // ⭐ [수정됨] 불편 지수 등급 기준 변경 (0~100점 스케일)
    let complaintInfo = { text: '', class1: '', tag1: '' };
    if (complaintScore <= 25) complaintInfo = { text: '낮음', class1: 'tag-success', tag1: '안정' };
    else if (complaintScore <= 50) complaintInfo = { text: '중간', class1: 'tag-warning', tag1: '주의' };
    else if (complaintScore <= 75) complaintInfo = { text: '높음', class1: 'tag-danger', tag1: '경고' };
    else complaintInfo = { text: '매우 높음', class1: 'tag-danger', tag1: '위험' };

    let budgetTag = { text: '', class: '' };
    if (deltaBudget < 0) budgetTag = { text: '예산 절감', class: 'tag-success' };
    else if (deltaBudget < baseBusCostYear * 0.15) budgetTag = { text: '소폭 증가', class: 'tag-info' };
    else budgetTag = { text: '예산 부담 증가', class: 'tag-warning' };

    const isBudgetOk = deltaBudget <= baseBusCostYear * 0.15;
    let strategyProposal = { title: '', actionItems: [], tone: '' };

    if (weather.type === 'snow') {
      const delayRatio = (effectiveHeadway / inputs.tramHeadway).toFixed(1);
      strategyProposal = { title: `❄️ 폭설 비상 대응 (적설량 ${weather.intensity}cm)`, actionItems: [`운행 속도 ${Math.round(speedFactor*100)}%로 감속`, `실제 배차 ${effectiveHeadway.toFixed(1)}분 (${delayRatio}배 지연)`], tone: 'danger' };
    } else if (weather.type === 'rain') {
      const delayRatio = (effectiveHeadway / inputs.tramHeadway).toFixed(1);
      strategyProposal = { title: `🌧️ 호우 안전 대책 (강수량 ${weather.intensity}mm)`, actionItems: [`안전 감속 운행 중 (속도 ${Math.round(speedFactor*100)}%)`, `실제 배차 ${effectiveHeadway.toFixed(1)}분 (${delayRatio}배 지연)`], tone: 'negative' };
    } else if (congestionPercent >= 100) {
      strategyProposal = { title: '🚨 수송 용량 포화', actionItems: [`배차 간격 ${Math.max(3, inputs.tramHeadway - 2)}분으로 즉시 단축`, '예비 차량 전량 투입'], tone: 'danger' };
    } else if (congestionPercent < 50) {
      strategyProposal = { title: '💸 운영 효율화 필요', actionItems: ['배차 간격 확대하여 예산 절감', '탄력 배차제 도입'], tone: 'negative' };
    } else if (isBudgetOk && congestionPercent >= 70 && congestionPercent <= 95) {
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
      co2Reduction, pineTrees, carReduction,
      headwayWeekend, headwayPeak 
    };
  }, [inputs, weather, tramBaseData]);

  const evaluatePolicy = () => {
    const { congestionPercent, complaintScore, deltaBudget } = results;
    const { baseBusCostYear } = inputs;
    const budgetChangePercent = (deltaBudget / baseBusCostYear) * 100;

    let status = '🟡 시범 적용 권장';
    let comment = '혼잡도 또는 민원 위험에 대해 추가 모니터링이 필요합니다.';
    let isRecommended = false;

    if (weather.type !== 'sunny') {
        status = '⚠️ 기상 악화 주의';
        comment = '기상 악화로 인해 변동성이 큽니다. 보수적인 운영이 필요합니다.';
    } else if (congestionPercent >= 100) {
        status = '🔴 적용 비권장 (수용 초과)';
        comment = `🚨 혼잡도 ${congestionPercent.toFixed(0)}%로 수용 한계에 도달했습니다. 승객 탑승 불가 상황이 우려됩니다.`;
    } else if (complaintScore >= 60) {
        status = '🔴 적용 비권장 (민원 폭주)';
        comment = `🚨 민원 위험 점수 ${complaintScore}점으로 높음. 특히 버스 감축으로 인한 환승 민원이 우려됩니다.`;
    } else if (budgetChangePercent > 20) {
        status = '🟡 시범 적용 권장 (예산 주의)';
        comment = `💰 예산 증감률이 ${budgetChangePercent.toFixed(1)}%로 다소 높습니다. 예산 절감을 위한 추가 노력이 필요합니다.`;
    } else if (congestionPercent <= 95 && complaintScore < 55 && budgetChangePercent <= 15) {
        status = '🟢 정책 시험 적용 승인 (Best)'; 
        comment = '👍 혼잡도와 예산이 합리적인 수준입니다. 정책 시행을 강력히 권장합니다.';
        isRecommended = true;
    }
    return { status, comment, isRecommended };
  };

  const handleSaveScenario = () => {
    setSavedScenarios([{ id: Date.now(), time: new Date().toLocaleTimeString(), inputs: { ...inputs }, results: { ...results }, weather: {...weather} }, ...savedScenarios]);
    alert("현재 시나리오가 저장되었습니다. '결정 기록'에서 확인하세요.");
  };
  const formatWon = (num) => Math.round(num).toLocaleString('ko-KR') + '원';
  const formatPercent = (num) => num.toFixed(1) + '%';
  
  const handleAcceptPolicy = () => {
    const judgementResult = evaluatePolicy();
    const budgetChangePercent = (results.deltaBudget / inputs.baseBusCostYear) * 100;
    const newLogEntry = {
        id: Date.now(),
        time: new Date().toLocaleString(),
        input: `배차 ${inputs.tramHeadway}분 / 감축 ${inputs.busCut}%`,
        results: `혼잡 ${results.congestionPercent.toFixed(1)}% / 민원 ${results.complaintScore} / 예산 ${budgetChangePercent > 0 ? '+' : ''}${budgetChangePercent.toFixed(1)}%`,
        judgement: judgementResult.status,
        comment: judgementResult.comment,
        reportSummary: judgementResult.status.includes('🟢') ? "즉시 적용 가능. 예산 및 민원 안정적." : (judgementResult.status.includes('🟡') ? `시범 적용 권장. ${judgementResult.comment}` : `적용 비권장. ${judgementResult.comment}`)
    };
    setDecisionLogs(prevLogs => [newLogEntry, ...prevLogs]);
    alert(`✅ 정책 시험 적용이 승인되었습니다.\n결과: ${judgementResult.status}`);
    setAlternativeSuggestion(null);
  };

  const handleSuggestAlternative = async () => {
    if (tramBaseData.length === 0) {
        alert("데이터 로딩 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }
    setAlternativeSuggestion("🔍 최적 대안을 AI가 분석 중입니다...");
    setTimeout(() => {
        const targetHeadway = 7;
        const targetBusCut = 25;
        
        const { costPerTramRun, baseBusCostYear, operationHours } = inputs;
        const MAX_CAPACITY = 5000;
        const targetPassenger = 3500; 
        const headwayP = targetHeadway / 6;
        const adjPass = targetPassenger * headwayP;
        const congP = Math.min((adjPass / MAX_CAPACITY) * 100, 100);

        const effHW = targetHeadway; 
        const runsW = (operationHours * 60) / effHW;
        const costW = runsW * 245 * costPerTramRun;
        const runsWe = (operationHours * 60) / (effHW * 1.5);
        const costWe = runsWe * 110 * costPerTramRun;
        const runsP = (operationHours * 60) / (effHW * 0.8);
        const costP = runsP * 10 * costPerTramRun;
        const tCost = Math.round(costW + costWe + costP);

        const bCost = baseBusCostYear * (1 - targetBusCut / 100);
        const delta = tCost + bCost - baseBusCostYear;
        const budgetChangePercent = (delta / baseBusCostYear) * 100;
        // ⭐ 대안 추천에서도 동일한 로직 적용
        let rawCompScore = (targetBusCut * 1.0) + (congP * 0.5);
        if(congP > 100) rawCompScore += 10;
        const compScore = Math.min(rawCompScore, 100);
        
        const optimalResult = {
            input: { tramHeadway: targetHeadway, busCut: targetBusCut },
            results: { congestion: congP, complaintScore: compScore, budgetChangePercent: budgetChangePercent }
        };
        setAlternativeSuggestion(optimalResult);
    }, 700);
  };

  const policyEvaluation = evaluatePolicy();

  return (
    <div className="tram-simulation-container">
      {/* 스타일 정의 */}
      <style>{`
        .basis-label { font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 4px; letter-spacing: -0.5px; }
        .basis-congestion { color: #ea580c; background-color: #ffedd5; border: 1px solid #fed7aa; } 
        .basis-budget { color: #dc2626; background-color: #fee2e2; border: 1px solid #fecaca; } 
        .basis-complaint { color: #d97706; background-color: #fef3c7; border: 1px solid #fde68a; }
        .page-intro-box { background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; align-items: start; gap: 16px; }
        .dynamic-intro-box { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; align-items: start; gap: 12px; }
        .policy-btn { flex: 1; padding: 14px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 14px; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .btn-approve { background-color: #1e293b; color: white; }
        .btn-approve:hover { background-color: #0f172a; transform: translateY(-2px); }
        .btn-suggest { background-color: #2563eb; color: white; }
        .btn-suggest:hover { background-color: #1d4ed8; transform: translateY(-2px); }
        .traffic-bar-wrapper { width: 100%; height: 10px; background-color: #e2e8f0; border-radius: 999px; overflow: hidden; margin-top: 8px; }
        .traffic-bar-fill { height: 100%; transition: width 0.5s ease-out, background-color 0.5s ease-out; }
        .weather-warning { font-size: 12px; color: #dc2626; font-weight: bold; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        
        /* 모달 스타일 */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; backdrop-filter: blur(4px); }
        .modal-content { background: white; padding: 24px; border-radius: 20px; width: 600px; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); position: relative; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .action-card-btn { background: white; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; text-align: left; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 4px; }
        .action-card-btn:hover { border-color: #3b82f6; background-color: #eff6ff; transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
      `}</style>

      {/* 헤더 네비게이션 */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <button onClick={() => navigate('/dashboard')} className="back-btn"><ArrowLeft size={18} /> 메인 지도로</button>
      </div>

      {/* 상단: 전체 페이지 설명 */}
      <div className="page-intro-box">
        <div style={{color: '#0284c7', marginTop:'2px'}}><BadgeCheck size={32}/></div>
        <div>
            <div style={{fontWeight:'800', color:'#075985', marginBottom:'6px', fontSize:'16px'}}>정책 사전 검증 및 최적화 시뮬레이션</div>
            <div style={{fontSize:'13px', color:'#334155', lineHeight:'1.6'}}>
            이 화면은 정책 시행 전, <strong>교통 혼잡·예산·민원 위험을 사전에 검증</strong>하여 <strong>세금 낭비를 방지</strong>하기 위한 도구입니다.<br/>
            대전의 실데이터로 검증된 로직을 적용하여 유동적인 배차 간격 조정을 위한 객관적 지표를 제공하며,<br/>
            <span style={{color:'#0f766e', fontWeight:'bold'}}>트램 도입 도시(위례, 동탄 등)로 즉시 확장 가능한 표준화된 솔루션(SaaS)</span>입니다.
            </div>
        </div>
      </div>
      
      <div className="tram-layout" style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* 1. 정책 변수 입력 패널 (좌측) */}
        <div className="tram-card" style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <div className="weather-section">
            <div className="label-line">🌤️ 기상 조건 설정</div>
            <div className="weather-buttons">
              {['sunny', 'rain', 'snow'].map(type => (
                <button 
                    key={type} 
                    onClick={() => handleWeatherChange(type)} // ⭐ 여기서 변경된 핸들러 호출
                    className={`weather-btn ${weather.type === type ? 'active' : ''}`}
                >
                  {type === 'sunny' ? <Sun size={20}/> : type === 'rain' ? <CloudRain size={20}/> : <Snowflake size={20}/>}
                  {type === 'sunny' ? '맑음' : type === 'rain' ? '비' : '눈'}
                </button>
              ))}
            </div>
            {weather.type !== 'sunny' && (
              <div className="weather-intensity">
                <div className="label-line" style={{marginTop:'10px', fontSize:'13px'}}><span>강도</span><span style={{color:'#2563eb'}}>{weather.intensity} {weather.type === 'rain' ? 'mm' : 'cm'}</span></div>
                <input type="range" min="10" max="100" step="10" value={weather.intensity} onChange={(e) => setWeather({...weather, intensity: Number(e.target.value)})} />
              </div>
            )}
          </div>
          <div className="divider"></div>
          <div className="card-title">1. 정책 변수 입력</div>
          <div className="card-subtitle">정책 및 환경 변수를 조정합니다.</div>
          <div className="form-row">
            <div className="label-line">
                <span>평시 기준 배차 간격</span>
                <span>{inputs.tramHeadway}분</span>
            </div>
            <div className="input-inline"><input type="range" name="tramHeadway" min="3" max="15" step="1" value={inputs.tramHeadway} onChange={handleChange} /></div>
            
            <div style={{fontSize: '11px', color: '#64748b', marginTop: '4px', padding: '8px', backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0'}}>
                <Calculator size={14} className="text-blue-500"/> 
                <span>
                    <strong>AI 자동 보정:</strong> 주말 <span className="text-blue-600 font-bold">{results.headwayWeekend.toFixed(1)}분</span> / 성수기 <span className="text-red-500 font-bold">{results.headwayPeak.toFixed(1)}분</span> 자동 적용
                </span>
            </div>

            {weather.type !== 'sunny' && (
                <div className="weather-warning">
                    <AlertTriangle size={12}/> 기상 악화: 실제 {results.effectiveHeadway.toFixed(1)}분 간격 지연 운행
                </div>
            )}
          </div>
          <div className="form-row"><div className="label-line"><span>버스 노선 감축률</span><span style={{ color: inputs.busCut >= 30 ? '#ef4444' : 'inherit' }}>{inputs.busCut}%</span></div><div className="input-inline"><input type="range" name="busCut" min="0" max="50" step="5" value={inputs.busCut} onChange={handleChange} /></div></div>
          
          <div className="form-row">
            <div className="label-line"><span>출근 시간대 예상 승객</span></div>
            <div className="input-inline">
              <input type="number" name="passengerPeak" value={inputs.passengerPeak.toString()} onChange={handleChange} max="5000" />
              <span className="unit-label">명/시간 (최대 5000)</span>
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
          
          {/* 탄력 운영 설명 배너 */}
          <div className="dynamic-intro-box">
            <div style={{color: '#64748b', marginTop:'2px'}}><Calculator size={24}/></div>
            <div>
              <div style={{fontWeight:'800', color:'#334155', marginBottom:'4px', fontSize:'14px'}}>연간 탄력 운영(Dynamic Operation) 시뮬레이터</div>
              <div style={{fontSize:'12px', color:'#64748b', lineHeight:'1.4'}}>
                본 시스템은 <strong>평일(245일)·주말(110일)·성수기(10일) 탄력 계수</strong>를 적용하여 정밀한 예산을 산출합니다.<br/>
                단순 1년치 계산이 아닌, 실제 도시 운영 환경을 반영한 AI 예측 모델입니다.
              </div>
            </div>
          </div>

          <div className="card-header-row">
              <div>
                  <div className="card-title">2. 시뮬레이션 결과</div>
                  <div className="card-subtitle">기상 악화 및 정책 반영 리포트</div>
              </div>
              <button onClick={handleSaveScenario} className="save-btn"><Save size={16} /> 시나리오 저장</button>
          </div>
          
          {/* ⭐ 기능 버튼 그리드 (AI 분석 & 로그 기록) */}
          <div className="action-grid">
            <button className="action-card-btn" onClick={() => setActiveModal('ai')}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:'800', color:'#2563eb'}}>
                    <BarChart3 size={20}/> AI 정책 분석 및 대안
                </div>
                <div style={{fontSize:'12px', color:'#64748b'}}>현재 정책의 위험도를 분석하고 최적의 대안을 추천받습니다.</div>
            </button>
            <button className="action-card-btn" onClick={() => setActiveModal('history')}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:'800', color:'#475569'}}>
                    <List size={20}/> 정책 결정 기록 (History)
                </div>
                <div style={{fontSize:'12px', color:'#64748b'}}>채택된 정책의 로그를 확인하고 비교합니다.</div>
            </button>
          </div>

          {/* 메인 결과 카드 4개 */}
          <div className="results-grid">
            <div className="result-box">
                <span className="basis-label basis-budget"><AlertCircle size={12}/> 재정 판단 근거</span>
                <div className="result-title">최종 소요 예산</div>
                <div className="result-value">{formatWon(results.totalBudget)}</div>
                <div style={{fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 'bold'}}>
                    *평일(245) + 주말(110) + 성수기(10) 탄력 계수 적용
                </div>
                <div className="result-sub">증감: {results.deltaBudget > 0 ? '+' : ''}{formatWon(results.deltaBudget)}</div>
                <div className="pill-row"><div className={`pill ${results.budgetTag.class}`}>{results.budgetTag.text}</div></div>
            </div>

            <div className="result-box">
                <span className="basis-label basis-congestion"><AlertTriangle size={12}/> 혼잡 판단 근거</span>
                <div className="result-title">실질 혼잡도 (날씨 반영)</div>
                <div className="result-value" style={{color: results.congestionInfo.color}}>{results.congestionInfo.text} ({formatPercent(results.congestionPercent)})</div>
                <div className="traffic-bar-wrapper">
                    <div className="traffic-bar-fill" style={{ width: `${results.congestionPercent}%`, backgroundColor: results.congestionInfo.color }}></div>
                </div>
                {weather.type !== 'sunny' && <div className="weather-delay-msg">⚠️ 기상 악화로 배차 지연 중</div>}
            </div>
            
            <div className="result-box">
                <span className="basis-label basis-complaint"><Lightbulb size={12}/> 민원 판단 근거</span>
                <div className="result-title">시민 불편 지수</div>
                <div className="result-value">{results.complaintInfo.text} ({results.complaintScore}점)</div>
                <div className="pill-row"><div className={`pill ${results.complaintInfo.class1}`}>{results.complaintInfo.tag1}</div></div>
            </div>

            <div className="result-box" style={{backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}}>
              <div className="result-title" style={{color: '#166534'}}>🌱 환경 개선 효과</div>
              <div className="env-stats">
                <div className="env-item"><Wind size={16}/> <span>CO2 감축: <strong>{results.co2Reduction}톤</strong></span></div>
                <div className="env-item"><Leaf size={16}/> <span>소나무 식재: <strong>{results.pineTrees}그루</strong></span></div>
                <div className="env-item"><Car size={16}/> <span>승용차 감소: <strong>{results.carReduction.toLocaleString()}대</strong></span></div>
              </div>
            </div>
          </div>

          {/* ⭐ 핵심 수치 요약 */}
          <div className="section-title" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>3. 핵심 수치 요약</div>
          <table className="mini-table">
            <thead><tr><th>지표</th><th>값</th><th>비고</th></tr></thead>
            <tbody>
                <tr><td>일일 트램 운행</td><td>{results.tramRunsPerDay.toLocaleString()}회</td><td>평일 기준 (배차 {inputs.tramHeadway}분)</td></tr>
                <tr><td>트램 연간 비용</td><td>{formatWon(results.tramCostYear)}</td><td>평일/주말/피크 탄력 적용</td></tr>
                <tr><td>버스 연간 비용</td><td>{formatWon(results.busCostYear)}</td><td>감축 {inputs.busCut}% 적용</td></tr>
            </tbody>
          </table>
          
          <div className="text-[10px] text-slate-400 font-medium text-right mt-4">※ 본 시뮬레이션 결과는 2024년 대전광역시 공공데이터포털 실데이터를 기반으로 산출되었습니다.</div>
        </div>
      </div>

      {/* =================================================================================================
          ⭐ 팝업(모달) 영역 - 버튼을 눌렀을 때만 나타납니다 
         ================================================================================================= */}
      
      {/* 1. AI 정책 분석 모달 */}
      {activeModal === 'ai' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                    <h2 style={{fontSize:'20px', fontWeight:'800', color:'#1e3a8a', display:'flex', alignItems:'center', gap:'10px'}}>
                        <BarChart3 /> AI 정책 분석 및 제안
                    </h2>
                    <button onClick={() => setActiveModal(null)} style={{background:'none', border:'none', cursor:'pointer'}}><X /></button>
                </div>

                {/* AI 보고서 내용 */}
                <div className={`result-box strategy-box ${results.strategyProposal.tone}`} style={{marginBottom:'20px'}}>
                    <div className="result-title">AI 정책 제안 보고서</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        {results.strategyProposal.tone === 'danger' && <AlertTriangle size={20} color="#ef4444" />}
                        <span style={{ fontSize: '15px', fontWeight: 'bold' }}>{results.strategyProposal.title}</span>
                    </div>
                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                        {results.strategyProposal.actionItems.map((item, idx) => (<li key={idx} style={{ marginBottom: '4px' }}>{item}</li>))}
                    </ul>
                </div>

                {/* 분석 결과 및 승인 버튼 */}
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom:'20px' }}>
                   <div style={{marginBottom: '15px'}}>
                     <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                        {policyEvaluation.isRecommended ? <CheckCircle size={20} color="#16a34a"/> : <AlertCircle size={20} color="#ea580c"/>}
                        <span style={{fontWeight:'bold', color: '#334155'}}>AI 정책 분석 결과: </span>
                        <span style={{fontWeight:'bold', color: policyEvaluation.isRecommended ? '#16a34a' : '#ea580c'}}>{policyEvaluation.status}</span>
                     </div>
                     <div style={{fontSize:'13px', color:'#64748b', paddingLeft:'28px'}}>{policyEvaluation.comment}</div>
                   </div>

                   <div style={{display:'flex', gap:'12px'}}>
                      <button className="policy-btn btn-approve" onClick={handleAcceptPolicy}>
                        <CheckCircle size={18}/> 정책 시험 적용 승인
                      </button>
                      <button className="policy-btn btn-suggest" onClick={handleSuggestAlternative}>
                        <TrendingUp size={18}/> 대안 정책 자동 추천
                      </button>
                   </div>
                </div>

                {/* 대안 추천 결과 */}
                {alternativeSuggestion && (
                    <div style={{ padding: '15px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', animation: 'fadeIn 0.3s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ backgroundColor: '#2563eb', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>AI 추천</span>
                            <strong style={{color: '#1e3a8a'}}>최적 대안 발견</strong> 
                        </div>
                        {typeof alternativeSuggestion === 'string' ? (
                            <div style={{fontSize:'13px', color:'#2563eb', fontWeight:'bold'}}>{alternativeSuggestion}</div>
                        ) : (
                            <div>
                                <div style={{fontSize:'14px', fontWeight:'bold', color:'#172554', marginBottom:'4px'}}>
                                    배차 {alternativeSuggestion.input.tramHeadway}분 / 감축 {alternativeSuggestion.input.busCut}%
                                </div>
                                <div style={{ fontSize: '13px', color: '#475569' }}>
                                    (예측 결과: 혼잡 {alternativeSuggestion.results.congestion.toFixed(1)}%, 민원 {alternativeSuggestion.results.complaintScore.toFixed(0)}, 예산 {alternativeSuggestion.results.budgetChangePercent > 0 ? '+' : ''}{alternativeSuggestion.results.budgetChangePercent.toFixed(1)}%)
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* 2. 정책 기록(로그) 모달 */}
      {activeModal === 'history' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                    <h2 style={{fontSize:'20px', fontWeight:'800', color:'#475569', display:'flex', alignItems:'center', gap:'10px'}}>
                        <List /> 정책 결정 기록
                    </h2>
                    <button onClick={() => setActiveModal(null)} style={{background:'none', border:'none', cursor:'pointer'}}><X /></button>
                </div>
                
                {/* 기존 로그 컴포넌트 */}
                <DecisionLog logs={decisionLogs} />
                
                {/* 시나리오 저장 기록 */}
                {savedScenarios.length > 0 && (
                    <div className="history-section" style={{marginTop:'30px'}}>
                        <div className="section-title"><History size={16}/> 저장된 시나리오</div>
                        <div className="scenario-list">
                            {savedScenarios.map((sc) => (
                                <div key={sc.id} className="scenario-card">
                                    <div className="sc-header"><span className="sc-time">{sc.time}</span><span className="sc-badge">{sc.weather.type}</span></div>
                                    <div className="sc-body">
                                        <div>배차: <strong>{sc.inputs.tramHeadway}분</strong></div>
                                        <div>감축: <strong>{sc.inputs.busCut}%</strong></div>
                                        <div className="sc-result">예산: {Math.round(sc.results.totalBudget / 100000000).toLocaleString()}억</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

    </div>
  );
};
export default TramSimulation;