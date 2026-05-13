import type { NavigateFunction } from 'react-router-dom'

let _navigate: NavigateFunction | null = null

export function setAppNavigate(nav: NavigateFunction): void {
  _navigate = nav
}

export function appNavigate(to: string): void {
  if (_navigate) {
    _navigate(to)
    return
  }
  window.location.assign(to.startsWith('/') ? to : `/${to}`)
}
