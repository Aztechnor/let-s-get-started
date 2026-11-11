import { useCallback, useState } from "react";

/**
 * Hook for managing loading states with error handling
 */
export function useLoading<T = unknown>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (fn: () => Promise<T>) => {
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        const result = await fn();
        setData(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    execute,
    reset,
    setIsLoading,
    setError,
    setData,
  };
}

/**
 * Hook for managing async state with initial loading
 */
export function useAsync<T = unknown>(fn: () => Promise<T>) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fn();
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fn]);

  // Initial load
  useCallback(() => {
    refetch();
  }, [refetch])();

  return {
    isLoading,
    error,
    data,
    refetch,
  };
}

/**
 * Hook for debouncing function calls
 */
export function useDebounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
) {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return new Promise<ReturnType<T>>((resolve) => {
        const id = setTimeout(() => {
          resolve(func(...args));
        }, wait);
        setTimeoutId(id);
      });
    },
    [func, wait, timeoutId]
  ) as T;
}

/**
 * Hook for managing form state with loading and errors
 */
export function useFormState<T extends Record<string, unknown>>(
  initialValues: T
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = useCallback((name: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setSubmitError(null);
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
    setSubmitError(null);
    setSubmitSuccess(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    handleChange,
    setFieldError,
    clearErrors,
    setIsSubmitting,
    setSubmitError,
    setSubmitSuccess,
    reset,
  };
}
