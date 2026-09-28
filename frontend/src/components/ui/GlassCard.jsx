import React from 'react';

const GlassCard = ({ 
  children, 
  className = '', 
  hover = true, 
  glow = false, 
  glowColor = 'primary', 
  onClick, 
  padding = 'p-5' 
}) => {
  const baseClasses = 'bg-[#fffefa] border border-[#e5e4dc] rounded-2xl shadow-sm text-[#292c27] relative overflow-hidden transition-all duration-200';
  
  const hoverClasses = hover ? 'hover:border-[#c9c7ba] hover:shadow-md' : '';
  const cursorClass = onClick ? 'cursor-pointer' : '';
  
  let glowClasses = '';
  if (glow) {
    if (glowColor === 'primary') glowClasses = 'animate-pulse-glow';
    else if (glowColor === 'success') glowClasses = 'animate-pulse-glow-success';
    else if (glowColor === 'error') glowClasses = 'animate-pulse-glow-error';
  }

  return (
    <div 
      className={`${baseClasses} ${hoverClasses} ${glowClasses} ${cursorClass} ${padding} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default GlassCard;
