import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'elevated' | 'filled' | 'outlined';
}

export const Card: React.FC<CardProps> = ({ 
  children, className = '', onClick, variant = 'elevated' 
}) => {
  const baseStyles = "rounded-[20px] overflow-hidden transition-all duration-200";
  
  const variants = {
    // Surface color, shadow
    elevated: "bg-white shadow-sm hover:shadow-md border border-slate-50/50", 
    // Surface Variant color, no shadow
    filled: "bg-slate-50 border border-transparent",
    // Surface color, border, no shadow
    outlined: "bg-white border border-slate-200",
  };

  return (
    <div 
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''} ${className}`}
    >
      {children}
    </div>
  );
};