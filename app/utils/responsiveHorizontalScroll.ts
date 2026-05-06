import { mapVerticalToHorizontalScroll } from './horizontalScroll'

export type ResponsiveOptions = {
  breakpointRatio?: number // width/height threshold (default 1)
  portraitClass?: string // class applied when portrait (default 'is-portrait')
  mapOptions?: Parameters<typeof mapVerticalToHorizontalScroll>[1]
}

/**
 * Initialize responsive horizontal scrolling: enables the vertical->horizontal
 * mapping when the screen ratio is >= `breakpointRatio`, otherwise disables
 * it and adds a CSS class to switch layout to vertical.
 * Returns a disposer that cleans listeners and active mapping.
 */
export function initResponsiveHorizontalScroll(
  el: HTMLElement,
  opts: ResponsiveOptions = {},
) {
  const {
    breakpointRatio = 1,
    portraitClass = 'is-portrait',
    mapOptions = {},
  } = opts

  let disposeMap: (() => void) | null = null

  const isLandscape = () => window.innerWidth / window.innerHeight >= breakpointRatio

  function update() {
    if (isLandscape()) {
      el.classList.remove(portraitClass)
      if (!disposeMap) disposeMap = mapVerticalToHorizontalScroll(el, mapOptions)
    } else {
      el.classList.add(portraitClass)
      if (disposeMap) {
        disposeMap()
        disposeMap = null
      }
    }
  }

  update()

  const onResize = () => update()
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)

  return () => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
    if (disposeMap) {
      disposeMap()
      disposeMap = null
    }
  }
}

export default initResponsiveHorizontalScroll
