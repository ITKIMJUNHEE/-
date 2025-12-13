import React from 'react';
import { History, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const DecisionLog = ({ logs }) => {
    if (!logs || logs.length === 0) {
        return (
            <div className="history-section" style={{ marginTop: '25px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b' }}>
                    <History size={16} /> 정책 결정 기록
                </div>
                <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#64748b' }}>아직 채택된 정책 기록이 없습니다.</p>
            </div>
        );
    }

    const getIcon = (status) => {
        if (status.includes('🟢')) return <CheckCircle size={16} color="#22c55e" />;
        if (status.includes('🟡')) return <AlertTriangle size={16} color="#fbbf24" />;
        if (status.includes('🔴')) return <XCircle size={16} color="#ef4444" />;
        return <History size={16} color="#64748b" />;
    };

    return (
        <div className="history-section" style={{ marginTop: '25px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>
                <History size={18} /> 정책 결정 로그
            </div>
            <div className="scenario-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.map((log) => (
                    <div key={log.id} style={{ 
                        border: '1px solid #f1f5f9', 
                        padding: '12px', 
                        borderRadius: '6px', 
                        backgroundColor: '#f8fafc',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                {getIcon(log.judgement)} {log.judgement}
                            </span>
                            <span style={{ color: '#64748b' }}>{log.time}</span>
                        </div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>
                            {log.input}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>
                            {log.reportSummary}
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                            결과: {log.results}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DecisionLog;