import React from 'react';
import { GeminiAnalysisResult } from '../types';
import { X, AlertTriangle, Lightbulb, ArrowRight, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GeminiAnalysisResult | null;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">AI Capacity Analysis</h2>
              <p className="text-sm text-slate-500">Powered by Gemini 1.5 Pro</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Executive Summary */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">Executive Summary</h3>
            <p className="text-slate-700 leading-relaxed">{result.summary}</p>
          </div>

          {/* Risks & Recommendations Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="flex items-center gap-2 text-red-600 font-semibold mb-3">
                <AlertTriangle size={18} />
                Identified Risks
              </h3>
              <ul className="space-y-3">
                {result.risks.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 bg-red-50 p-3 rounded-lg border border-red-100">
                    <span className="mt-0.5 text-red-400">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-blue-600 font-semibold mb-3">
                <Lightbulb size={18} />
                Strategic Recommendations
              </h3>
              <ul className="space-y-3">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <span className="mt-0.5 text-blue-400">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Suggested Allocations */}
          {result.suggestedAllocations && result.suggestedAllocations.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-green-600 font-semibold mb-3">
                <CheckCircle2 size={18} />
                Suggested Allocations
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="p-3">Issue Key</th>
                      <th className="p-3">Suggested Assignee</th>
                      <th className="p-3">Reasoning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.suggestedAllocations.map((alloc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600">{alloc.issueKey}</td>
                        <td className="p-3 font-medium text-slate-900">{alloc.suggestedAssigneeId}</td>
                        <td className="p-3 text-slate-600">{alloc.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <Button onClick={onClose}>Close Analysis</Button>
        </div>
      </div>
    </div>
  );
};