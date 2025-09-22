import React, { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

// --- Helper Components ---

const Instructions = ({ onStartGame }) => (
  <div className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center flex flex-col items-center animate-fade-in z-10">
    <h1 className="text-5xl font-bold text-white mb-4">Gesture RPS</h1>
    <p className="text-xl text-gray-300 mb-8">The classic game, controlled by your hands.</p>
    
    <div className="flex flex-col md:flex-row justify-around w-full mb-8 text-white">
      <div className="mb-6 md:mb-0">
        <h2 className="text-3xl font-semibold text-white mb-4">How to Play</h2>
        <div className="flex justify-center gap-8">
          <div className="flex flex-col items-center">
            <span className="text-7xl mb-2">✊</span>
            <p className="text-lg">Rock</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-7xl mb-2">✋</span>
            <p className="text-lg">Paper</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-7xl mb-2">✌️</span>
            <p className="text-lg">Scissors</p>
          </div>
        </div>
      </div>
      
      <div className="border-t-2 md:border-t-0 md:border-l-2 border-gray-600 pt-6 md:pt-0 md:pl-8">
         <h2 className="text-3xl font-semibold text-white mb-4">Game Rules</h2>
         <ul className="text-lg text-gray-300 text-left list-disc list-inside">
            <li>Rock crushes Scissors</li>
            <li>Paper covers Rock</li>
            <li>Scissors cuts Paper</li>
            <li className="mt-2 text-gray-400">Game is best of 5 rounds.</li>
         </ul>
      </div>
    </div>
    
    <button onClick={onStartGame} className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-xl text-2xl transition-transform transform hover:scale-105 shadow-lg">
      Start Game
    </button>
  </div>
);

const HistoryTable = ({ history }) => (
  <div className="w-full bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg flex-grow flex flex-col min-h-0">
    <h3 className="text-xl font-bold text-white text-center mb-4">Round History</h3>
    <div className="overflow-auto flex-grow">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
          <tr>
            <th scope="col" className="px-4 py-2">R</th>
            <th scope="col" className="px-4 py-2">You</th>
            <th scope="col" className="px-4 py-2">CPU</th>
            <th scope="col" className="px-4 py-2">Winner</th>
          </tr>
        </thead>
        <tbody>
          {[...history].reverse().map((item) => (
            <tr key={item.round} className="border-b border-gray-700 hover:bg-gray-700/30">
              <td className="px-4 py-1 font-medium">{item.round}</td>
              <td className="px-4 py-1 text-2xl">{item.player}</td>
              <td className="px-4 py-1 text-2xl">{item.computer}</td>
              <td className={`px-4 py-1 font-semibold ${item.winner === 'Player' ? 'text-green-400' : item.winner === 'CPU' ? 'text-red-400' : 'text-yellow-400'}`}>
                {item.winner}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const GameOver = ({ score, onResetGame }) => {
    const winnerText = score.player > score.computer ? "You are the Champion!" : score.computer > score.player ? "The Computer Wins!" : "It's a Draw!";
    const winnerColor = score.player > score.computer ? "text-green-400" : score.computer > score.player ? "text-red-400" : "text-yellow-400";
  return (
    <div className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-10 text-center flex flex-col items-center animate-fade-in z-10">
      <h1 className="text-5xl font-bold text-white mb-4">Game Over</h1>
      <h2 className={`text-4xl font-bold mb-6 ${winnerColor}`}>{winnerText}</h2>
      <p className="text-2xl text-gray-200 mb-8">Final Score: <span className="text-white font-bold">{score.player}</span> - <span className="text-white font-bold">{score.computer}</span></p>
      <button onClick={onResetGame} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-xl text-2xl transition-transform transform hover:scale-105 shadow-lg">
        Play Again
      </button>
    </div>
  );
};

const ChoiceDisplay = ({ title, choice, bgColor }) => (
    <div className={`w-full ${bgColor} rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner h-36 md:h-48 transition-all duration-300`}>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <div className="text-7xl animate-fade-in">
            {choice || '?'}
        </div>
    </div>
);

// --- Particle Background Logic ---
const ParticleCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particlesArray;

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    
    class Particle {
      constructor(x, y, directionX, directionY, size, color) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
      update() {
        if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
        if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (canvas.height * canvas.width) / 9000;
      for (let i = 0; i < numberOfParticles; i++) {
        let size = (Math.random() * 2) + 1;
        let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
        let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
        let directionX = (Math.random() * .4) - .2;
        let directionY = (Math.random() * .4) - .2;
        let color = 'rgba(150, 150, 255, 0.3)';
        particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
      }
    }

    let animationFrameId;
    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
      }
    }

    init();
    animate();

    const handleResize = () => {
      resizeCanvas();
      init();
    };

    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
    }
  }, []);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full -z-10 bg-gray-900"></canvas>;
};


// --- Main App Component ---
const socket = io('http://localhost:5001');

export default function App() {
  const [gameState, setGameState] = useState('instructions'); // instructions, player_turn, cpu_turn, reveal, game_over
  const [history, setHistory] = useState([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [roundResult, setRoundResult] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  const choiceMap = { 'Rock': '✊', 'Paper': '✋', 'Scissors': '✌️' };
  const choices = ['Rock', 'Paper', 'Scissors'];
  const playerChoiceRef = useRef(null);

  const resolveRound = useCallback((playerMove, cpuMove) => {
    setPlayerChoice(choiceMap[playerMove]);
    setComputerChoice(choiceMap[cpuMove]);

    let winner = '';
    if (!playerMove) { 
        winner = 'CPU';
        setScore(s => ({ ...s, computer: s.computer + 1 }));
    } else if (playerMove === cpuMove) {
      winner = 'Tie';
    } else if (
      (playerMove === 'Rock' && cpuMove === 'Scissors') ||
      (playerMove === 'Paper' && cpuMove === 'Rock') ||
      (playerMove === 'Scissors' && cpuMove === 'Paper')
    ) {
      winner = 'Player';
      setScore(s => ({ ...s, player: s.player + 1 }));
    } else {
      winner = 'CPU';
      setScore(s => ({ ...s, computer: s.computer + 1 }));
    }

    const resultText = !playerMove
        ? 'No gesture detected! CPU wins.'
        : winner === 'Player' ? 'You win this round!' 
        : winner === 'CPU' ? 'Computer wins this round!' 
        : "It's a tie!";
    
    setHistory(h => [...h, { round, player: choiceMap[playerMove] || '?', computer: choiceMap[cpuMove], winner }]);
    setRoundResult(resultText);
    setGameState('reveal');
  }, [round, choiceMap]);


  useEffect(() => {
    let timerId;

    if (gameState === 'player_turn') {
      playerChoiceRef.current = null;
    } else if (gameState === 'cpu_turn') {
        const cpuMove = choices[Math.floor(Math.random() * choices.length)];
        const playerMove = playerChoiceRef.current;
        setPlayerChoice(choiceMap[playerMove] || '❓');

        timerId = setTimeout(() => {
            resolveRound(playerMove, cpuMove);
        }, 3000);
    } else if (gameState === 'reveal') {
      timerId = setTimeout(() => {
        if (round >= 5) {
          setGameState('game_over');
        } else {
          setRound(r => r + 1);
          setPlayerChoice(null);
          setComputerChoice(null);
          setRoundResult('');
          setGameState('player_turn');
        }
      }, 2500);
    }

    return () => {
      clearTimeout(timerId);
    };
  }, [gameState, round, resolveRound]);

  
  useEffect(() => {
    const handleGesture = (data) => {
        if (gameState === 'player_turn' && !playerChoiceRef.current) {
            playerChoiceRef.current = data.gesture;
            setGameState('cpu_turn');
        }
    };
    
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('gesture_detected', handleGesture);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('gesture_detected', handleGesture);
    };
  }, [gameState]);


  const resetGame = () => {
    setGameState('instructions');
    setHistory([]);
    setRound(1);
    setScore({ player: 0, computer: 0 });
    setPlayerChoice(null);
    setComputerChoice(null);
    setRoundResult('');
  };

  const renderGameStatus = () => {
      switch(gameState) {
          case 'player_turn':
              return <h3 className="text-xl md:text-2xl font-semibold text-yellow-300 animate-pulse">Your Turn! Show your gesture...</h3>;
          case 'cpu_turn':
              return <h3 className="text-xl md:text-2xl font-semibold text-blue-300 animate-pulse">Computer is thinking...</h3>;
          case 'reveal':
              return <h3 className="text-xl md:text-2xl font-semibold text-green-300 animate-fade-in">{roundResult}</h3>;
          default:
            return <h3 className="text-2xl font-semibold">&nbsp;</h3>
      }
  };

  const renderMainGame = () => (
    <div className="w-full h-full flex flex-col p-2 sm:p-4 z-10">
      <header className="w-full py-2 bg-black/20 backdrop-blur-sm rounded-b-xl mb-4">
        <h1 className="text-center text-2xl sm:text-3xl lg:text-4xl font-bold text-white uppercase tracking-widest">
          Rock Paper Scissor
        </h1>
      </header>
      <div className="w-full flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
        {/* Left Column */}
        <div className="flex flex-col gap-4 lg:gap-6">
            <div className="w-full h-48 md:h-64 bg-black rounded-2xl shadow-lg relative overflow-hidden flex items-center justify-center">
                   <img 
                       src="http://localhost:5001/video_feed" 
                       alt="Video Feed" 
                       className="w-full h-full object-cover" 
                   />
                <div className={`absolute top-4 right-4 w-4 h-4 rounded-full ring-2 ring-black ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="absolute top-3 right-10 text-xs text-white font-semibold uppercase tracking-wider">{isConnected ? 'Connected' : 'Offline'}</span>
            </div>
            <ChoiceDisplay title="Your Move" choice={playerChoice} bgColor="bg-blue-900/50" />
        </div>
        {/* Middle Column (Score, Status) - Reordered for mobile */}
        <div className="flex flex-col justify-center lg:justify-between items-center text-white gap-4 lg:gap-6 order-first lg:order-none">
            <div className="text-center">
                <h2 className="text-3xl lg:text-4xl font-bold">Round {round}</h2>
                <p className="text-md lg:text-lg text-gray-300">Best of 5</p>
            </div>
            <div className="text-center bg-gray-800/80 py-2 px-6 rounded-xl shadow-lg">
                <p className="text-4xl lg:text-5xl font-mono tracking-widest">{score.player} : {score.computer}</p>
                <p className="text-xs text-gray-400">SCORE</p>
            </div>
           <div className="h-16 text-center flex items-center">
              {renderGameStatus()}
          </div>
        </div>
        {/* Right Column */}
        <div className="flex flex-col gap-4 lg:gap-6">
            <ChoiceDisplay title="Computer's Move" choice={computerChoice} bgColor="bg-red-900/50" />
            <HistoryTable history={history} />
        </div>
      </div>
    </div>
  );

  const renderGameState = () => {
    switch (gameState) {
      case 'instructions':
        return <Instructions onStartGame={() => setGameState('player_turn')} />;
      case 'game_over':
        return <GameOver score={score} onResetGame={resetGame} />;
      default:
        return renderMainGame();
    }
  };

  return (
    <main className="font-sans w-full h-screen flex items-center justify-center text-white overflow-hidden bg-gray-900">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
      <ParticleCanvas />
      {renderGameState()}
    </main>
  );
}

