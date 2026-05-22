import React, { useState } from "react";
import { caesarEncrypt } from "../../core/engine/caesar";

export default function CaesarGame({ stage, onComplete }) {
  const encrypted = caesarEncrypt(stage.word, 3);
  const [input, setInput] = useState("");

  const check = () => {
    if (input.toUpperCase() === stage.word) {
      onComplete(stage);
    }
  };

  return (
    <div>
      <h2>Fishing Cipher</h2>
      <p>Encrypted: {encrypted}</p>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button onClick={check}>Catch Fish</button>
    </div>
  );
}