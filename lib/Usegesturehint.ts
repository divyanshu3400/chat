import { useEffect } from 'react'
import { useAppStore } from './Useappstore'
export const useGestureHint = () => {
    const { ui, setShowGestureHint } = useAppStore()

    useEffect(() => {
        // Hide gesture hint after 5 seconds if user hasn't dismissed it
        if (!ui.showGestureHint) return

        const timeout = setTimeout(() => {
            setShowGestureHint(false)
        }, 5000)

        return () => clearTimeout(timeout)
    }, [ui.showGestureHint, setShowGestureHint])

    const dismissHint = () => {
        setShowGestureHint(false)
        // Save to localStorage so hint doesn't show again
        localStorage.setItem('gestureHintDismissed', 'true')
    }

    return {
        showGestureHint: ui.showGestureHint,
        dismissHint,
    }
}