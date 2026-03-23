import { useEffect, useRef } from 'react'

interface DragGestureConfig {
    threshold?: number // pixels to drag before triggering (default: 80)
    onDragStart?: () => void
    onDragEnd?: () => void
    onDragProgress?: (progress: number) => void
    onComplete?: () => void
}

export const useDragGesture = (
    enabled: boolean = true,
    config: DragGestureConfig = {}
) => {
    const {
        threshold = 80,
        onDragStart,
        onDragEnd,
        onDragProgress,
        onComplete,
    } = config

    const dragStateRef = useRef({
        isDragging: false,
        startX: 0,
        currentX: 0,
    })

    useEffect(() => {
        if (!enabled) return

        const handleTouchStart = (e: TouchEvent) => {
            // Only trigger from left edge (first 40px)
            if (e.touches[0].clientX > 40) return

            dragStateRef.current = {
                isDragging: true,
                startX: e.touches[0].clientX,
                currentX: e.touches[0].clientX,
            }

            onDragStart?.()
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (!dragStateRef.current.isDragging) return

            const currentX = e.touches[0].clientX
            const delta = currentX - dragStateRef.current.startX
            dragStateRef.current.currentX = currentX

            // Calculate progress (0 to 1)
            const progress = Math.min(delta / threshold, 1)
            onDragProgress?.(progress)

            // Prevent default scrolling while dragging
            if (delta > 10) {
                e.preventDefault()
            }
        }

        const handleTouchEnd = () => {
            if (!dragStateRef.current.isDragging) return

            const delta = dragStateRef.current.currentX - dragStateRef.current.startX

            dragStateRef.current.isDragging = false
            onDragEnd?.()

            // Trigger complete if dragged past threshold
            if (delta >= threshold) {
                onComplete?.()
            }
        }

        document.addEventListener('touchstart', handleTouchStart, { passive: true })
        document.addEventListener('touchmove', handleTouchMove, { passive: false })
        document.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
        }
    }, [enabled, threshold, onDragStart, onDragEnd, onDragProgress, onComplete])

    return dragStateRef.current
}