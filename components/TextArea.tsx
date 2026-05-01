import React, { forwardRef } from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ label, ...props }, ref) => {
  return (
    <div>
      {label && (
        <label htmlFor={props.id || 'textarea'} className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={props.id || 'textarea'}
        className="w-full h-40 p-3 bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
        {...props}
      ></textarea>
      <p className="text-right text-sm text-slate-400 mt-2">
          {String(props.value || '').length} characters
      </p>
    </div>
  );
});

TextArea.displayName = 'TextArea';

export default TextArea;