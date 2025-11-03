import React from "react";
import Typira from "../assets/typira.png";

const Login: React.FC = () => {
  const handleLogin = () => {
    window.electronAPI.loginSuccess();
  };

  return (
    <>
      <div className="w-screen h-screen flex flex-col justify-center items-center">
        <a href="https://github.com/EricV29">
          <img src={Typira} alt="typira" className="h-[150px]" />
        </a>
        <h1>Login</h1>
        <button onClick={handleLogin}>Next</button>
      </div>
    </>
  );
};

export default Login;
