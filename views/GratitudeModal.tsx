import React, { useState } from 'react';

interface GratitudeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}

const GratitudeModal: React.FC<GratitudeModalProps> = ({ isOpen, onClose, onSave }) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (text.trim()) {
      onSave(text);
      setText('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl transform transition-all animate-fade-in">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Gratitude Journal</h3>
        <p className="text-slate-500 text-sm mb-4">What is one small thing that made you smile today?</p>
        
        <textarea
          autoFocus
          rows={3}
          className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400 resize-none mb-6"
          placeholder="I enjoyed a warm cup of coffee..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        
        <div className="flex space-x-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!text.trim()}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold shadow-sm shadow-orange-200 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default GratitudeModal;
