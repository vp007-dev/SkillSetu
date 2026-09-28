import React from 'react';

const Badge = ({ children, variant = 'default', size = 'sm', dot = false, icon: Icon }) => {
  const baseClasses = 'font-semibold rounded-full inline-flex items-center gap-1';
  
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  }[size] || sizeClasses.sm;

  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 font-bold',
    error: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold',
    info: 'bg-sky-50 text-sky-700 border border-sky-200 font-bold',
    job: 'bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold',
    internship: 'bg-purple-50 text-purple-700 border border-purple-200 font-bold',
    hackathon: 'bg-orange-50 text-orange-800 border border-orange-200 font-bold',
    competition: 'bg-pink-50 text-pink-700 border border-pink-200 font-bold',
    conclave: 'bg-teal-50 text-teal-800 border border-teal-200 font-bold'
  };
  
  const dotColors = {
    default: 'bg-slate-500',
    primary: 'bg-indigo-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    error: 'bg-rose-600',
    info: 'bg-sky-600',
    job: 'bg-cyan-600',
    internship: 'bg-purple-600',
    hackathon: 'bg-orange-600',
    competition: 'bg-pink-600',
    conclave: 'bg-teal-600'
  };

  const styleClass = variantStyles[variant] || variantStyles.default;
  const dotColorClass = dotColors[variant] || dotColors.default;

  return (
    <span className={`${baseClasses} ${sizeClasses} ${styleClass}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
};

export default Badge;
