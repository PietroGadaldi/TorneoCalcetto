import { Route, Routes } from 'react-router-dom'
import GuestOnly from './components/GuestOnly'
import RequireAuth from './components/RequireAuth'
import Dashboard from './routes/Dashboard'
import Landing from './routes/Landing'
import Login from './routes/Login'
import Register from './routes/Register'
import Bracket from './routes/tournament/Bracket'
import Lobby from './routes/tournament/Lobby'
import Matches from './routes/tournament/Matches'
import Overview from './routes/tournament/Overview'
import Standings from './routes/tournament/Standings'
import Teams from './routes/tournament/Teams'
import TournamentLayout from './routes/tournament/TournamentLayout'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <GuestOnly>
            <Landing />
          </GuestOnly>
        }
      />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <Register />
          </GuestOnly>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/t/:tournamentId"
        element={
          <RequireAuth>
            <TournamentLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="lobby" element={<Lobby />} />
        <Route path="teams" element={<Teams />} />
        <Route path="matches" element={<Matches />} />
        <Route path="standings" element={<Standings />} />
        <Route path="bracket" element={<Bracket />} />
      </Route>
    </Routes>
  )
}

export default App
