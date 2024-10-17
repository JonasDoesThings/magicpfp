import * as React from 'react';

import {cn} from '~/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({className, type, ...props}, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

const PercentageInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({className, value, onChange, ...props}, ref) => {
    return (
      <input
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        step={1}
        min={0}
        max={150}
        {...props}
        type='number'
        value={Math.round(parseFloat(''+(value ?? '0').toString()) * 100)}
        onChange={(evt) => {
          evt.target.value = (evt.target.valueAsNumber / 100).toString();
          onChange?.(evt);
        }}
      />
    );
  }
);
PercentageInput.displayName = 'PercentageInput';

export {Input, PercentageInput};
