import { createBrowserRouter, RouterProvider } from 'react-router'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { GameProvider } from './context/GameContext'
import { GameSheetProvider } from './context/GameSheetContext'
import { FunToastContainer } from './components/FunToast'
import { LevelUpOverlay } from './components/LevelUpOverlay'
import { GrandSlamOverlay } from './components/GrandSlamOverlay'
import { GameSheet } from './components/GameSheet'
import { AuthPage } from './pages/AuthPage'
import { ConferenceSelector } from './pages/ConferenceSelector'
import { GridView } from './pages/GridView'
import { CardView } from './pages/CardView'
import { ListView } from './pages/ListView'
import { AddTargetPage } from './pages/AddTargetPage'
import { CoverageDashboard } from './pages/CoverageDashboard'
import { ProtectedRoute } from './components/ProtectedRoute'

const router = createBrowserRouter([
  { path: '/auth', element: <AuthPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <ConferenceSelector />
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId',
    element: (
      <ProtectedRoute>
        <ListView />
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/grid',
    element: (
      <ProtectedRoute>
        <GridView />
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/target/:targetId',
    element: (
      <ProtectedRoute>
        <CardView />
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/target/:targetId/edit',
    element: (
      <ProtectedRoute>
        <AddTargetPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/add',
    element: (
      <ProtectedRoute>
        <AddTargetPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/conference/:conferenceId/coverage',
    element: (
      <ProtectedRoute>
        <CoverageDashboard />
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
