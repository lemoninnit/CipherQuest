import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LoadingScreen from './pages/LoadingScreen';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/loading" element={<LoadingScreen />} />
        <Route 
          path="/dashboard" 
          element={
            <DashboardLayout>
              <DashboardHome />
            </DashboardLayout>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
