import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/HomePage';
import TempPage from './Pages/TempPage';
import EMTSimulation from './Pages/EMTSimulation';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/temp" element={<TempPage />} />
        <Route path="/simulation" element={<EMTSimulation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
