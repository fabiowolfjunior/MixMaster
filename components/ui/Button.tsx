import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal' | 'fab';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'filled', icon, className = '', ...props 
}) => {
  // MD3 Base Specs
  const baseStyles = "relative overflow-hidden inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-38 disabled:pointer-events-none active:scale-[0.98]";
  
  const variants = {
    // Primary / Filled Button
    filled: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md rounded-full px-6 py-2.5",
    
    // Secondary / Tonal Button (Surface Variant)
    tonal: "bg-indigo-100 text-indigo-900 hover:bg-indigo-200 rounded-full px-6 py-2.5",
    
    // Outlined Button
    outlined: "border border-slate-300 text-indigo-600 hover:bg-indigo-50 rounded-full px-6 py-2.5",
    
    // Text Button
    text: "text-indigo-600 hover:bg-indigo-50 rounded-full px-4 py-2",
    
    // Floating Action Button (FAB)
    fab: "bg-indigo-200 text-indigo-900 hover:bg-indigo-300 shadow-md hover:shadow-lg rounded-[16px] w-14 h-14 p-0",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {icon && <span className={variant === 'fab' ? "w-6 h-6" : "w-[18px] h-[18px]"}>{icon}</span>}
      {children}
    </button>
  );
};