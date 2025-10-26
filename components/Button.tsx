import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingMessage?: string;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, isLoading = false, loadingMessage = 'Processing...', icon, className, ...props }) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
        props.disabled || isLoading
          ? 'bg-slate-700 cursor-not-allowed'
          : 'bg-gradient-to-r from-sky-600 to-cyan-500 hover:shadow-[0_0_15px_theme(colors.sky.500/50%)] hover:scale-[1.02] active:scale-[0.98] focus:ring-sky-500'
      } ${className}`}
      disabled={props.disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner />
          <span>{loadingMessage}</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;