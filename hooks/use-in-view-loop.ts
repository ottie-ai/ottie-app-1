import { useEffect, useRef, useState } from "react"

/**
 * Ensures the staggering effect will not stutter and plays out
 * before being interrupted.
 * 
 * Essentially turns the transition into an animation that flips to the
 * other side when the element receives a `mouseenter` or `mouseleave` event.
 */
export function useInViewLoop(
  interval: number = 1500,
  enabled: boolean = true
): [boolean, React.RefObject<HTMLDivElement>] {
  const [hover, setHover] = useState(false)
  const [animating, setAnimating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    const startLoop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      intervalRef.current = setInterval(() => {
        if (!animating) {
          setHover((prev) => !prev)
        }
      }, interval)
    }

    startLoop()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [interval, enabled, animating])

  return [hover, ref]
}
