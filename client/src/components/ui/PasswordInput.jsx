import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password field with a show/hide (eye) toggle inside the input.
 * Pass the input's own classes via `className` (right padding for the icon is added here);
 * every other prop goes straight to the <input>.
 */
export default function PasswordInput({ className = '', wrapperClassName = '', iconSize = 16, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${wrapperClassName}`}>
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
      >
        {visible ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
      </button>
    </div>
  );
}
