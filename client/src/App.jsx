import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/HomePage';
import TempPage from './Pages/TempPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/temp" element={<TempPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
