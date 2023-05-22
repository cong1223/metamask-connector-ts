import {
  useCallback,
  Dispatch,
  useLayoutEffect,
  useEffect,
  useRef
} from 'react'

// Hide `useLayoutEffect` warning with SSR
// See: https://medium.com/@alexandereardon/uselayouteffect-and-ssr-192986cdcf7a
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function useSafeDispatch<T>(dispatch: Dispatch<T>) {
  const mountedRef = useRef(false)

  useIsomorphicLayoutEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const safeDispatch = useCallback(
    (action: T) => {
      if (mountedRef.current) {
        dispatch(action)
      }
    },
    [dispatch]
  )

  return safeDispatch
}
