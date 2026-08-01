import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import LogPage from './pages/LogPage'
import TrendsPage from './pages/TrendsPage'
import TriagePage from './pages/TriagePage'
import ResourcesPage from './pages/ResourcesPage'
import SettingsPage from './pages/SettingsPage'
import SplashPage from './pages/SplashPage'

export default function App() {
  const [hasStarted, setHasStarted] = useState(false)

  return (
    <>
      {!hasStarted && <SplashPage onStart={() => setHasStarted(true)} />}
      <BrowserRouter>
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
          <NavBar />
          <main id="main-content" tabIndex={-1} style={{ flex: 1 }}>
            <Routes>
              <Route path="/"          element={<LogPage />} />
              <Route path="/trends"    element={<TrendsPage />} />
              <Route path="/triage"    element={<TriagePage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/settings"  element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </>
  )
}
