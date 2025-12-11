import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './TramSimulation.css';

const TramSimulation = () => {
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    tramHeadway: 6,
    busCut: 20,
    passengerPeak: 4500,
    costPerTramRun: 3500000,
    baseBusCostYear: 120000000000,
    operationHours: 18
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const formatWon = (num) => Math.round(num).toLocaleString('ko-KR') + '원';
  const formatPercent = (num) => num.toFixed(1) + '%';

  const results = useMemo(() => {
    const { tramHeadway, busCut, passengerPeak, costPerTramRun, baseBusCostYear, operationHours } = inputs;

    const tramRunsPerDay = Math.round((operationHours * 60) / tramHeadway);
    const tramCostYear = tramRunsPerDay * 365 * costPerTramRun;
    const busCostYear = baseBusCostYear * (1 - busCut / 100);
    const totalBudget = tramCostYear + busCostYear;
    const deltaBudget = totalBudget - baseBusCostYear;

    const capacityPerTram = 200;
    const peakCapacityPerHour = (60 / tramHeadway) * capacityPerTram;
    const congestionIndex = peakCapacityPerHour > 0 ? passengerPeak / peakCapacityPerHour : 0;
    const congestionPercent = congestionIndex * 100;
    
    // util is not defined in original code snippet provided, assuming basic logic or omitting if unused. 
    // Added back basic calc for completion if needed.
    const utilization = peakCapacityPerHour > 0 ? Math.min(passengerPeak / peakCapacityPerHour, 2) : 0;

    const complaintScore = (busCut * 0.6) + (Math.max(0, congestionIndex - 0.9) * 100 * 0.4);

    let congestionInfo = { text: '', explain: '', tagClass: '' };
    if (congestionIndex < 0.6) {
      congestionInfo = { text: '여유 있음', explain: '수요 대비 수송 용량 여유. 공차율 높음 주의.', tagClass: 'tag-success' };
    } else if (congestionIndex < 0.9) {
      congestionInfo = { text: '적정 수준', explain: '수요·공급 균형 양호. 서비스 만족 예상.', tagClass: 'tag-info' };
    } else if (congestionIndex < 1.1) {
      congestionInfo = { text: '주의 필요', explain: '피크 시간 혼잡 발생 가능. 분산 대책 필요.', tagClass: 'tag-warning' };
    } else {
      congestionInfo = { text: '매우 혼잡', explain: '용량 부족으로 승차 실패 및 민원 급증 예상.', tagClass: 'tag-danger' };
    }

    let complaintInfo = { text: '', desc: '', tag1: '', tag2: '', class1: '', class2: '' };
    if (complaintScore < 15) {
      complaintInfo = { text: '낮음', desc: '버스 감축이 적고 혼잡도 안정적.', tag1: '안정 시나리오', class1: 'tag-success', tag2: '데이터 대응 가능', class2: 'tag-info' };
    } else if (complaintScore < 30) {
      complaintInfo = { text: '중간', desc: '일부 사각지대 발생 가능. 셔틀 검토.', tag1: '취약지역 모니터링', class1: 'tag-warning', tag2: '보완책 검토', class2: 'tag-info' };
    } else if (complaintScore < 50) {
      complaintInfo = { text: '높음', desc: '감축폭과 혼잡도가 높아 초기 민원 집중.', tag1: '민원 다발 경고', class1: 'tag-warning', tag2: '보완 대책 필수', class2: 'tag-info' };
    } else {
      complaintInfo = { text: '매우 높음', desc: '교통 약자 반발 예상. 단계적 적용 권장.', tag1: '심각한 민원 예상', class1: 'tag-danger', tag2: '이동권 대책 필요', class2: 'tag-warning' };
    }

    const isBudgetOk = deltaBudget <= baseBusCostYear * 0.15;
    const isCongestionOk = congestionIndex >= 0.7 && congestionIndex <= 1.05;
    let goldenInfo = { text: '', desc: '', tag1: '', class1: '' };

    if (isBudgetOk && isCongestionOk) {
      goldenInfo = { text: '균형 잡힌 시나리오', desc: '예산과 서비스(혼잡) 균형이 양호한 구간.', tag1: '정책 설명 추천', class1: 'tag-success' };
    } else if (!isBudgetOk && isCongestionOk) {
      goldenInfo = { text: '서비스 우선 시나리오', desc: '혼잡은 좋으나 예산 부담 큼. 설득 논리 필요.', tag1: '예산 검토 필요', class1: 'tag-warning' };
    } else if (isBudgetOk && !isCongestionOk) {
      goldenInfo = { text: '예산 우선 시나리오', desc: '예산은 좋으나 혼잡도 높음. 증편 필요.', tag1: '서비스 개선 필요', class1: 'tag-warning' };
    } else {
      goldenInfo = { text: '조정 필요 시나리오', desc: '예산·혼잡 모두 부담. 변수 재조정 권장.', tag1: '재조정 필요', class1: 'tag-danger' };
    }

    let budgetTag = { text: '', class: '' };
    if (deltaBudget < 0) {
      budgetTag = { text: '예산 절감', class: 'tag-success' };
    } else if (deltaBudget < baseBusCostYear * 0.1) {
      budgetTag = { text: '소폭 증가', class: 'tag-info' };
    } else {
      budgetTag = { text: '예산 부담 증가', class: 'tag-warning' };
    }

    return { tramRunsPerDay, tramCostYear, busCostYear, totalBudget, deltaBudget, congestionIndex, congestionPercent, utilization, congestionInfo, complaintScore, complaintInfo, goldenInfo, budgetTag };
  }, [inputs]);

  return (
    <div className="tram-simulation-container">
      {/* 뒤로 가기 버튼 */}
      <button 
        onClick={() => navigate('/')} 
        className="flex items-center gap-2 px-4 py-2 mb-6 bg-white rounded-lg border border-gray-300 shadow-sm text-gray-700 font-bold hover:bg-gray-50 transition-all"
      >
        <ArrowLeft size={18} /> 메인 지도로 돌아가기
      </button>

      <div className="tram-layout">
        {/* 왼쪽: 입력 영역 */}
        <div className="tram-card">
          <div className="card-title">1. 정책 변수 입력</div>
          <div className="card-subtitle">트램·버스 관련 주요 가정을 조정합니다.</div>
          
          <div className="form-row">
            <div className="label-line">
              <span>트램 배차 간격 (피크)</span>
              <span>{inputs.tramHeadway}분</span>
            </div>
            <div className="input-inline">
              <input type="range" name="tramHeadway" min="3" max="15" step="1" value={inputs.tramHeadway} onChange={handleChange} />
              <span className="badge">단위: 분</span>
            </div>
          </div>

          <div className="form-row">
            <div className="label-line">
              <span>버스 노선 감축률</span>
              <span>{inputs.busCut}%</span>
            </div>
            <div className="input-inline">
              <input type="range" name="busCut" min="0" max="50" step="5" value={inputs.busCut} onChange={handleChange} />
              <span className="badge">단위: %</span>
            </div>
          </div>

          <div className="form-row">
            <div className="label-line"><span>출근 시간대 예상 승객</span></div>
            <div className="input-inline">
              <input type="number" name="passengerPeak" min="500" max="10000" value={inputs.passengerPeak} onChange={handleChange} />
              <span className="badge">명/시간</span>
            </div>
          </div>

           <div className="form-row">
            <div className="label-line"><span>1회 트램 운행 비용</span></div>
            <div className="input-inline">
              <input type="number" name="costPerTramRun" step="500000" value={inputs.costPerTramRun} onChange={handleChange} />
              <span className="badge">원</span>
            </div>
          </div>

          <div className="form-row">
            <div className="label-line"><span>연간 버스 운영비 (기준)</span></div>
            <div className="input-inline">
              <input type="number" name="baseBusCostYear" step="1000000000" value={inputs.baseBusCostYear} onChange={handleChange} />
              <span className="badge">원</span>
            </div>
          </div>

           <div className="form-row">
            <div className="label-line"><span>운행 시간대 설정</span></div>
            <div className="input-inline">
              <select name="operationHours" value={inputs.operationHours} onChange={handleChange}>
                <option value="18">18시간 (05~23시)</option>
                <option value="16">16시간 (06~22시)</option>
                <option value="20">20시간 (04~24시)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 오른쪽: 결과 영역 */}
        <div className="tram-card">
          <div className="card-title">2. 시뮬레이션 결과</div>
          <div className="card-subtitle">실시간 지표 분석</div>

          <div className="results-grid">
            <div className="result-box">
              <div className="result-title">최종 소요 예산</div>
              <div className="result-value">{formatWon(results.totalBudget)}</div>
              <div className="result-sub">증감: {results.deltaBudget > 0 ? '+' : ''}{formatWon(results.deltaBudget)}</div>
              <div className="pill-row"><div className={`pill ${results.budgetTag.class}`}>{results.budgetTag.text}</div></div>
            </div>

            <div className="result-box">
              <div className="result-title">피크 혼잡도</div>
              <div className="result-value">{results.congestionInfo.text} ({formatPercent(results.congestionPercent)})</div>
              <div className="traffic-bar-wrapper">
                <div className="traffic-bar-bg">
                  <div className="traffic-bar-fill" style={{ width: `${Math.min(results.congestionPercent / 1.5, 100)}%` }}></div>
                </div>
              </div>
              <div className="pill-row"><div className={`pill ${results.congestionInfo.tagClass}`}>{results.congestionInfo.text}</div></div>
            </div>

            <div className="result-box">
              <div className="result-title">민원 위험도</div>
              <div className="result-value">{results.complaintInfo.text} (지수 {results.complaintScore.toFixed(1)})</div>
              <div className="pill-row">
                <div className={`pill ${results.complaintInfo.class1}`}>{results.complaintInfo.tag1}</div>
                <div className={`pill ${results.complaintInfo.class2}`}>{results.complaintInfo.tag2}</div>
              </div>
            </div>

            <div className="result-box">
              <div className="result-title">전략 제안</div>
              <div className="result-value" style={{ fontSize: '15px' }}>{results.goldenInfo.text}</div>
              <div className="result-sub">{results.goldenInfo.desc}</div>
            </div>
          </div>

          <div className="section-title">3. 핵심 수치 요약</div>
          <table className="mini-table">
            <thead><tr><th>지표</th><th>값</th><th>비고</th></tr></thead>
            <tbody>
              <tr><td>일일 트램 운행</td><td>{results.tramRunsPerDay.toLocaleString()}회</td><td>배차 {inputs.tramHeadway}분</td></tr>
              <tr><td>트램 연간 비용</td><td>{formatWon(results.tramCostYear)}</td><td>운행 비용 기반</td></tr>
              <tr><td>버스 연간 비용</td><td>{formatWon(results.busCostYear)}</td><td>감축 {inputs.busCut}% 적용</td></tr>
            </tbody>
          </table>
          
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#999', textAlign: 'right' }}>
            ※ 모든 수치는 시뮬레이션 추정값입니다.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TramSimulation;