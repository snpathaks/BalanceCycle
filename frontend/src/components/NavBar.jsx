/**
 * NavBar — top horizontal bar matching reference design.
 * Logo left, nav pill links right. No bottom/sidebar nav.
 */
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/',         label: 'Log' },
  { to: '/trends',   label: 'Trends' },
  { to: '/triage',   label: 'Triage' },
  { to: '/resources',label: 'Resources' },
  { to: '/settings', label: 'Settings' },
]

export default function NavBar() {
  return (
    <header className="top-nav" role="banner">
      <NavLink to="/" className="nav-logo" aria-label="BalanceCycle home">
        <span className="nav-logo-name">BalanceCycle</span>
        <span className="nav-logo-tag">hormonal · plain · private</span>
      </NavLink>

      <nav aria-label="Main navigation">
        <ul className="nav-links" role="list" style={{ listStyle: 'none' }}>
          {NAV_ITEMS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                aria-current={({ isActive }) => isActive ? 'page' : undefined}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
