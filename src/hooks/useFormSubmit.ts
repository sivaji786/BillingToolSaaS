import { useState } from 'react';
import { toast } from 'sonner';

interface UseFormSubmitOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
}

function extractErrorMessage(err: unknown, fallback?: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  return fallback || 'An error occurred';
}

export function useFormSubmit(options: UseFormSubmitOptions = {}) {
  const { successMessage, errorMessage, onSuccess } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (fn: () => Promise<void>) => {
    setIsSubmitting(true);
    try {
      await fn();
      if (successMessage) toast.success(successMessage);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting };
}
