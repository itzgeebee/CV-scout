
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MatchScoreProps {
  score: number;
  small?: boolean;
}

const MatchScore: React.FC<MatchScoreProps> = ({ score, small = false }) => {
  const data = [
    { name: 'Match', value: score },
    { name: 'Gap', value: 100 - score },
  ];

  const getColor = (s: number) => {
    if (s >= 80) return '#10b981'; // green-500
    if (s >= 50) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const size = small ? "h-12 w-12" : "h-48 w-48";
  const innerRadius = small ? 15 : 60;
  const outerRadius = small ? 22 : 80;

  return (
    <div className={`relative ${size} mx-auto`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell fill={getColor(score)} />
            <Cell fill="#e2e8f0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`${small ? 'text-[10px]' : 'text-4xl'} font-black tracking-tighter`} style={{ color: getColor(score) }}>
          {score}%
        </span>
        {!small && (
          <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Match Score</span>
        )}
      </div>
    </div>
  );
};

export default MatchScore;
