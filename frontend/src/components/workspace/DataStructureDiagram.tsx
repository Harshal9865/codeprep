import React from 'react';

interface DiagramProps {
  type: 'lru-cache' | 'linked-list' | 'binary-tree' | 'array-pointers';
  className?: string;
}

export const DataStructureDiagram: React.FC<DiagramProps> = ({ type, className = '' }) => {
  if (type === 'lru-cache') {
    return (
      <div className={`p-4 rounded-lg bg-surface-subtle border border-border-default space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
          <span>DATA STRUCTURE MODEL: HASH MAP + DOUBLY-LINKED LIST</span>
          <span className="text-primary font-medium">O(1) GET / PUT</span>
        </div>
        <svg viewBox="0 0 680 180" className="w-full h-auto text-xs font-mono select-none">
          {/* Defs for arrowheads and gradients */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>

          {/* Hash Table Block */}
          <rect x="20" y="20" width="130" height="140" rx="8" fill="#11131a" stroke="#2d3345" strokeWidth="1.5" />
          <text x="85" y="42" fill="#94a3b8" textAnchor="middle" fontWeight="bold" fontSize="11">HASH MAP</text>
          <line x1="20" y1="52" x2="150" y2="52" stroke="#2d3345" strokeWidth="1" />
          
          <rect x="30" y="62" width="110" height="24" rx="4" fill="#191b23" stroke="#3b82f6" strokeWidth="1" />
          <text x="85" y="78" fill="#f1f5f9" textAnchor="middle" fontSize="10">Key: 1 → Node*</text>

          <rect x="30" y="94" width="110" height="24" rx="4" fill="#191b23" stroke="#2d3345" strokeWidth="1" />
          <text x="85" y="110" fill="#f1f5f9" textAnchor="middle" fontSize="10">Key: 2 → Node*</text>

          <rect x="30" y="126" width="110" height="24" rx="4" fill="#191b23" stroke="#2d3345" strokeWidth="1" />
          <text x="85" y="142" fill="#f1f5f9" textAnchor="middle" fontSize="10">Key: 3 → Node*</text>

          {/* Hash to Node pointers */}
          <path d="M 140 74 C 180 74, 210 100, 250 100" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#arrow)" />

          {/* Dummy HEAD */}
          <rect x="180" y="80" width="45" height="40" rx="6" fill="#191b23" stroke="#2d3345" strokeWidth="1" />
          <text x="202" y="104" fill="#94a3b8" textAnchor="middle" fontSize="10">HEAD</text>

          {/* Node 1 (MRU) */}
          <rect x="260" y="75" width="105" height="50" rx="6" fill="#11131a" stroke="#10b981" strokeWidth="1.5" />
          <text x="312" y="96" fill="#10b981" textAnchor="middle" fontWeight="bold" fontSize="11">MRU Node</text>
          <text x="312" y="114" fill="#f1f5f9" textAnchor="middle" fontSize="10">[K: 1 | V: 10]</text>

          {/* Node 2 */}
          <rect x="400" y="75" width="105" height="50" rx="6" fill="#11131a" stroke="#2d3345" strokeWidth="1" />
          <text x="452" y="96" fill="#94a3b8" textAnchor="middle" fontSize="11">Active Node</text>
          <text x="452" y="114" fill="#f1f5f9" textAnchor="middle" fontSize="10">[K: 2 | V: 20]</text>

          {/* Node 3 (LRU - Eviction Target) */}
          <rect x="540" y="75" width="105" height="50" rx="6" fill="#11131a" stroke="#ef4444" strokeWidth="1.5" />
          <text x="592" y="96" fill="#ef4444" textAnchor="middle" fontWeight="bold" fontSize="11">LRU (Evict)</text>
          <text x="592" y="114" fill="#f1f5f9" textAnchor="middle" fontSize="10">[K: 3 | V: 30]</text>

          {/* Doubly Linked List Arrows */}
          <line x1="225" y1="95" x2="255" y2="95" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="365" y1="95" x2="395" y2="95" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="395" y1="105" x2="365" y2="105" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="505" y1="95" x2="535" y2="95" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arrow-red)" />
          <line x1="535" y1="105" x2="505" y2="105" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arrow-red)" />
        </svg>
      </div>
    );
  }

  // Generic Linked List Visualizer
  return (
    <div className={`p-4 rounded-lg bg-surface-subtle border border-border-default space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
        <span>LINKED LIST POINTER CHAIN</span>
      </div>
      <svg viewBox="0 0 500 80" className="w-full h-auto text-xs font-mono select-none">
        <defs>
          <marker id="generic-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>
        {/* Node 1 */}
        <rect x="20" y="20" width="70" height="40" rx="6" fill="#11131a" stroke="#2d3345" strokeWidth="1.5" />
        <text x="45" y="44" fill="#f1f5f9" textAnchor="middle" fontSize="12">1</text>
        <line x1="60" y1="20" x2="60" y2="60" stroke="#2d3345" strokeWidth="1" />
        <circle cx="75" cy="40" r="3" fill="#3b82f6" />
        <line x1="75" y1="40" x2="120" y2="40" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#generic-arrow)" />

        {/* Node 2 */}
        <rect x="130" y="20" width="70" height="40" rx="6" fill="#11131a" stroke="#2d3345" strokeWidth="1.5" />
        <text x="155" y="44" fill="#f1f5f9" textAnchor="middle" fontSize="12">2</text>
        <line x1="170" y1="20" x2="170" y2="60" stroke="#2d3345" strokeWidth="1" />
        <circle cx="185" cy="40" r="3" fill="#3b82f6" />
        <line x1="185" y1="40" x2="230" y2="40" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#generic-arrow)" />

        {/* Node 3 */}
        <rect x="240" y="20" width="70" height="40" rx="6" fill="#11131a" stroke="#2d3345" strokeWidth="1.5" />
        <text x="265" y="44" fill="#f1f5f9" textAnchor="middle" fontSize="12">3</text>
        <line x1="280" y1="20" x2="280" y2="60" stroke="#2d3345" strokeWidth="1" />
        <circle cx="295" cy="40" r="3" fill="#3b82f6" />
        <line x1="295" y1="40" x2="340" y2="40" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#generic-arrow)" />

        {/* Null terminator */}
        <text x="365" y="45" fill="#94a3b8" fontSize="12" fontWeight="bold">NULL</text>
      </svg>
    </div>
  );
};

