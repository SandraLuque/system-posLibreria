import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login/Login";
import Main from "./pages/MainPage";

function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/main" element={<Main />} />
        {}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
