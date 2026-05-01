import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import SalleManagement from './pages/salle'
import HistoriqueSalle from './pages/Historique'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={ <Dashboard/> }></Route>
        <Route path='/salles' element={ <SalleManagement/>}></Route>
        <Route path='/salles/historique' element={ <HistoriqueSalle/>}></Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
