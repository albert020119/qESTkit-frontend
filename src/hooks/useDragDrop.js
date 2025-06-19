import { useState, useEffect } from 'react';

/**
 * Hook to manage drag and drop operations for quantum gates
 */
export const useDragDrop = (onDrop) => {
  const [draggedGate, setDraggedGate] = useState(null);

  const handleDragStart = (gate) => {
    setDraggedGate(gate);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e, position) => {
    e.preventDefault();
    
    if (draggedGate) {
      // Call the onDrop callback with gate and drop position
      onDrop(draggedGate, position);
      setDraggedGate(null);
    }
  };

  return {
    draggedGate,
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
};
