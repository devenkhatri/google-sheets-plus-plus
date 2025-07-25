import React, { forwardRef, useId } from 'react';
import { TextField, TextFieldProps, InputAdornment, FormHelperText } from '@mui/material';
import { styled } from '@mui/material/styles';
import { getInputAccessibility } from '../../utils/accessibility';

interface InputProps extends Omit<TextFieldProps, 'variant'> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  variant?: 'outlined' | 'filled' | 'standard';
  description?: string;
  errorMessage?: string;
  'aria-describedby'?: string;
}

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(1),
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderWidth: 2,
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
  },
}));

const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  startIcon, 
  endIcon, 
  variant = 'outlined',
  description,
  errorMessage,
  error,
  required,
  disabled,
  label,
  'aria-describedby': ariaDescribedBy,
  ...props 
}, ref) => {
  const descriptionId = useId();
  const errorId = useId();
  
  const hasDescription = description || errorMessage;
  const describedBy = [
    ariaDescribedBy,
    description ? descriptionId : null,
    errorMessage ? errorId : null,
  ].filter(Boolean).join(' ') || undefined;

  const accessibilityProps = getInputAccessibility(
    typeof label === 'string' ? label : 'Input field',
    {
      required,
      invalid: error || !!errorMessage,
      readonly: props.InputProps?.readOnly,
      describedBy,
    }
  );

  const InputProps = {
    ...(startIcon && {
      startAdornment: (
        <InputAdornment position="start" aria-hidden="true">
          {startIcon}
        </InputAdornment>
      ),
    }),
    ...(endIcon && {
      endAdornment: (
        <InputAdornment position="end" aria-hidden="true">
          {endIcon}
        </InputAdornment>
      ),
    }),
    ...props.InputProps,
  };

  return (
    <div>
      <StyledTextField
        {...props}
        {...accessibilityProps}
        ref={ref}
        variant={variant}
        label={label}
        error={error || !!errorMessage}
        required={required}
        disabled={disabled}
        InputProps={InputProps}
        aria-describedby={describedBy}
      />
      {description && (
        <FormHelperText id={descriptionId} sx={{ mt: 0.5 }}>
          {description}
        </FormHelperText>
      )}
      {errorMessage && (
        <FormHelperText id={errorId} error sx={{ mt: 0.5 }}>
          {errorMessage}
        </FormHelperText>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;