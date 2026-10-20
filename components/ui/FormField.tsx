'use client';

import { type ReactNode, useId } from 'react';

export interface FormFieldRenderProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

export interface FormFieldProps {
  label: string;
  children: (props: FormFieldRenderProps) => ReactNode;
  id?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function FormField({
  label,
  children,
  id,
  hint,
  error,
  required = false,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = hint || error ? `${fieldId}-description` : undefined;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-2 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
      </label>
      {children({
        id: fieldId,
        'aria-describedby': descriptionId,
        'aria-invalid': error ? true : undefined,
      })}
      {(error || hint) && (
        <p
          id={descriptionId}
          className={`mt-1.5 text-xs leading-5 ${error ? 'text-danger' : 'text-muted-foreground'}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
