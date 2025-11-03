import { useEffect, useState } from "react";
import Typira from "../assets/typira.png";

export default function MainPage() {
  const [msgReply, setMsgReply] = useState("");
  const [msgReplyPrivate, setMsgReplyPrivate] = useState("");

  useEffect(() => {
    // GLOBAL LISTENER REPLY
    window.electronAPI.onMessageReply((data) => {
      setMsgReply(data);
    });

    // GLOBAL LISTENER PRIVATE
    window.electronAPI.onMessageReplyPrivate((data) => {
      setMsgReplyPrivate(data);
    });
  }, []);

  const sendMessage = () => {
    window.electronAPI.sendMessage("Hello from Main!");
  };

  const sendMessagePrivate = () => {
    window.electronAPI.sendMessagePrivate("Hello from Main Private!");
  };

  return (
    <>
      <div className="w-screen h-screen flex flex-col justify-center items-center gap-5">
        <a href="https://github.com/EricV29">
          <img src={Typira} alt="typira" className="h-[150px]" />
        </a>
        <h1>React(TS) + Vite + Electron(JS) + Tailwind</h1>
        <h2>Main Page</h2>
        <button onClick={sendMessage}>Send gloabl message</button>
        <p>Global answer: {msgReply}</p>

        <button onClick={sendMessagePrivate}>Send private message</button>
        <p>Private answer: {msgReplyPrivate}</p>
      </div>
    </>
  );
}
