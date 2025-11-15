import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './Components/Header';
import HomePage from './Pages/HomePage';
import TempPage from './Pages/TempPage';
import ResponseAreaPage from './Pages/ResponseAreaPage';
import SimulatedRadioPage from './Pages/SimulatedRadioPage';
import SimulatedPatientPage from './Pages/SimulatedPatientPage';
import Flashcards from './Pages/Flashcards';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/temp" element={<TempPage />} />
        <Route path="/response-area" element={<ResponseAreaPage />} />
        <Route path="/simulated-radio" element={<SimulatedRadioPage />} />
        <Route path="/simulated-patient" element={<SimulatedPatientPage />} />
        <Route path="/flashcards" element={<Flashcards />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
