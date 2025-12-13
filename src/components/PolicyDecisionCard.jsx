import React from 'react';
import { judgePolicy } from '../utils/policyJudge';

// 시뮬레이션 결과를 보여주는 KPI 카드와 비슷한 스타일링을 가정합니다.
const cardStyle = {
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    backgroundColor: '#fff'
};

const statusBoxStyle = (color) => ({
    padding: '10px 15px',
    borderRadius: '8px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '15px',
    color: '#333',
    // 색상 매핑 (CSS 변수 또는 인라인 스타일 조정 필요)
    backgroundColor: color === 'green' ? '#e6ffe6' : (color === 'yellow' ? '#fffbe6' : '#ffe6e6'),
    border: `2px solid ${color === 'green' ? '#4CAF50' : (color === 'yellow' ? '#FFC107' : '#F44336')}`,
});

const buttonGroupStyle = {
    display: 'flex',
    gap: '10px',
    justifyContent: 'space-between',
};

const buttonStyle = (isPrimary) => ({
    padding: '10px 15px',
    borderRadius: '5px',
    cursor: 'pointer',
    flex: 1,
    border: 'none',
    fontWeight: 'bold',
    backgroundColor: isPrimary ? '#1976D2' : '#607D8B', // Primary blue / Secondary grey
    color: 'white',
});

/**
 * 정책 판단 결과와 결정 버튼을 표시하는 컴포넌트입니다.
 *
 * @param {object} props
 * @param {number} props.congestion - 혼잡도 (%)
 * @param {number} props.complaintScore - 민원 위험 점수 (0~100)
 * @param {number} props.budgetChangePercent - 예산 증감률 (%)
 * @param {function} props.onAccept - '이 안을 채택' 버튼 클릭 핸들러
 * @param {function} props.onSuggestAlternative - '대안 자동 추천' 버튼 클릭 핸들러
 */
const PolicyDecisionCard = ({ 
    congestion, 
    complaintScore, 
    budgetChangePercent, 
    onAccept, 
    onSuggestAlternative 
}) => {
    // 1. 판단 로직 호출
    const result = judgePolicy(congestion, complaintScore, budgetChangePercent);
    const { status, comment, color } = result;

    return (
        <div style={cardStyle}>
            <h3>✅ 정책 판단 결과</h3>
            
            {/* 2. 판정 결과 박스 */}
            <div style={statusBoxStyle(color)}>
                {status}
            </div>

            <p style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}>
                {comment}
            </p>

            {/* 3. 버튼 그룹 */}
            <div style={buttonGroupStyle}>
                <button 
                    style={buttonStyle(true)} 
                    onClick={() => onAccept(result)}
                >
                    [채택]
                </button>
                <button 
                    style={buttonStyle(false)} 
                    onClick={onSuggestAlternative}
                >
                    [대안 자동 추천]
                </button>
            </div>
        </div>
    );
};

export default PolicyDecisionCard;