import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { GameProvider } from './context/GameContext'
import { GameSheetProvider } from './context/GameSheetContext'
import { FunToastContainer } from './components/FunToast'
import { LevelUpOverlay } from './components/LevelUpOverlay'
import { GrandSlamOverlay } from './components/GrandSlamOverlay'
import { GameSheet } from './components/GameSheet'
import { ProtectedRoute } from './components/ProtectedRoute'

const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })))
const ConferenceSelector = lazy(() => import('./pages/ConferenceSelector').then(m => ({ default: m.ConferenceSelector })))
const GridView = lazy(() => import('./pages/GridView').then(m => ({ default: m.GridView })))
const ListView = lazy(() => import('./pages/ListView').then(m => ({ default: m.ListView })))
const CardView = lazy(() => import('./pages/CardView').then(m => ({ default: m.CardView })))
const AddTargetPage = lazy(() => import('./pages/AddTargetPage').then(m => ({ default: m.AddTargetPage })))
const CoverageDashboard = lazy(() => import('./pages/CoverageDashboard').then(m => ({ default: m.CoverageDashboard })))

function PageLoader() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/auth', element: <Suspense fallback={<PageLoader />}><AuthPage /></Suspense> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}><ConferenceSelector /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}><ListView /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/grid',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}><GridView /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/target/:targetId',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}><CardView /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/target/:targetId/edit',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}><AddTargetPage /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/add',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}><AddTargetPage /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/coverage',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}><CoverageDashboard /></Suspense>
      </ProtectedRoute>
    ),
  },
])

function GameLayer() {
  return (
    <>
      <FunToastContainer />
      <LevelUpOverlay />
      <GrandSlamOverlay />
      <GameSheet />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GameProvider>
          <GameSheetProvider>
            <RouterProvider router={router} />
            <GameLayer />
          </GameSheetProvider>
        </GameProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
