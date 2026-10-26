import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import { GroupsPage } from './pages/GroupsPage'
import { GroupExpensesPage } from './pages/GroupExpensesPage'
import { SettlementsPage } from './pages/SettlementsPage'
import { GroupMembersPage } from './pages/GroupMembersPage'
import { ProfilePage } from './pages/ProfilePage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/groups" replace />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:groupId/expenses" element={<GroupExpensesPage />} />
            <Route path="/groups/:groupId/settlements" element={<SettlementsPage />} />
            <Route path="/groups/:groupId/members" element={<GroupMembersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/groups" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
