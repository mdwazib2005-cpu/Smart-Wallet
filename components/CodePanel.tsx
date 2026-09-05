
import React from 'react';

interface CodePanelProps {
  title: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  readonly?: boolean;
}

const CodePanel: React.FC<CodePanelProps> = ({ title, value, onChange, placeholder, readonly }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
        {!readonly && <span className="text-xs text-slate-500">Editable</span>}
      </div>
      <textarea
        className="flex-1 p-4 bg-transparent text-slate-200 code-font text-sm outline-none resize-none focus:ring-1 focus:ring-blue-500/50 transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readonly}
        spellCheck={false}
      />
    </div>
  );
};

export default CodePanel;
