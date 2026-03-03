import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, Play, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const GRID_SIZE = 20;
const CELL_SIZE = 20; // 20x20 grid = 400x400 logical canvas
const LOGICAL_CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SPEED = 120;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 50;

type Point = { x: number; y: number };

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 14 },
  { x: 10, y: 15 },
  { x: 10, y: 16 },
];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);
  const directionRef = useRef<Point>(INITIAL_DIRECTION);
  const nextDirectionRef = useRef<Point>(INITIAL_DIRECTION);
  const foodRef = useRef<Point>({ x: 10, y: 5 });
  const speedRef = useRef(INITIAL_SPEED);
  const lastMoveTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    let isOccupied = true;
    while (isOccupied) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      isOccupied = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    return newFood!;
  }, []);

  const startGame = () => {
    snakeRef.current = [...INITIAL_SNAKE];
    directionRef.current = { ...INITIAL_DIRECTION };
    nextDirectionRef.current = { ...INITIAL_DIRECTION };
    setScore(0);
    speedRef.current = INITIAL_SPEED;
    foodRef.current = generateFood(snakeRef.current);
    setGameState('playing');
    lastMoveTimeRef.current = performance.now();
  };

  const gameOver = () => {
    setGameState('gameover');
    setHighScore(prev => Math.max(prev, score));
  };

  const handleInput = useCallback((key: string) => {
    if (gameState !== 'playing') return;
    
    const currentDir = directionRef.current;
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (currentDir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (currentDir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (currentDir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (currentDir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
        break;
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      
      if (e.key === ' ' && gameState !== 'playing') {
        startGame();
        return;
      }
      
      handleInput(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput, gameState]);

  const update = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    if (time - lastMoveTimeRef.current >= speedRef.current) {
      lastMoveTimeRef.current = time;

      directionRef.current = nextDirectionRef.current;
      const currentDir = directionRef.current;
      const currentSnake = [...snakeRef.current];
      const head = currentSnake[0];

      const newHead = {
        x: head.x + currentDir.x,
        y: head.y + currentDir.y,
      };

      // Check wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        gameOver();
        return;
      }

      // Check self collision
      if (currentSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        gameOver();
        return;
      }

      currentSnake.unshift(newHead);

      // Check food collision
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        setScore(s => s + 10);
        speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREMENT);
        foodRef.current = generateFood(currentSnake);
      } else {
        currentSnake.pop();
      }

      snakeRef.current = currentSnake;
    }
  }, [gameState, generateFood]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, LOGICAL_CANVAS_SIZE, LOGICAL_CANVAS_SIZE);

    // Draw Grid (optional, subtle)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= LOGICAL_CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, LOGICAL_CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(LOGICAL_CANVAS_SIZE, i);
      ctx.stroke();
    }

    // Draw Food (Neon Pink/Magenta)
    const food = foodRef.current;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw Snake (Neon Cyan)
    const snake = snakeRef.current;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    
    snake.forEach((segment, index) => {
      // Head is slightly brighter/different
      if (index === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
      }
      
      // Draw rounded rectangle for snake segments
      const x = segment.x * CELL_SIZE + 1;
      const y = segment.y * CELL_SIZE + 1;
      const size = CELL_SIZE - 2;
      
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, size, size, 4);
      } else {
        ctx.rect(x, y, size, size);
      }
      ctx.fill();
    });

    // Reset shadow for next frame
    ctx.shadowBlur = 0;

  }, []);

  const gameLoop = useCallback((time: number) => {
    update(time);
    draw();
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameLoop]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-4 font-sans">
      
      {/* Header / Scoreboard */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 px-4 py-3 border border-cyan-500/30 rounded-xl bg-cyan-950/20 backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,255,0.1)]">
        <div className="flex flex-col">
          <span className="text-cyan-500/70 text-xs uppercase tracking-widest font-bold">Score</span>
          <span className="text-3xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]">{score}</span>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-fuchsia-500/70 text-xs uppercase tracking-widest font-bold flex items-center gap-1">
            <Trophy size={12} /> High Score
          </span>
          <span className="text-xl font-bold text-fuchsia-400 drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]">{highScore}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative group">
        {/* Neon glow behind canvas */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
        
        <div className="relative rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-[#0a0a0a]">
          <canvas
            ref={canvasRef}
            width={LOGICAL_CANVAS_SIZE}
            height={LOGICAL_CANVAS_SIZE}
            className="block w-full max-w-[400px] aspect-square"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Overlays */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] tracking-wider">
                NEON SNAKE
              </h1>
              <button 
                onClick={startGame}
                className="flex items-center gap-2 px-8 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400 text-cyan-400 rounded-full font-bold tracking-widest uppercase transition-all hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play size={20} /> Initialize
              </button>
              <p className="mt-6 text-white/40 text-sm tracking-widest uppercase">Press Space to start</p>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
              <h2 className="text-3xl font-black text-red-500 mb-2 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] tracking-widest">SYSTEM FAILURE</h2>
              <p className="text-white/60 mb-8 tracking-widest uppercase text-sm">Final Score: {score}</p>
              <button 
                onClick={startGame}
                className="flex items-center gap-2 px-8 py-3 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-400 text-fuchsia-400 rounded-full font-bold tracking-widest uppercase transition-all hover:shadow-[0_0_20px_rgba(255,0,255,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <RotateCcw size={20} /> Reboot
              </button>
              <p className="mt-6 text-white/40 text-sm tracking-widest uppercase">Press Space to restart</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="mt-8 grid grid-cols-3 gap-2 md:hidden w-full max-w-[240px]">
        <div />
        <ControlButton icon={<ChevronUp />} onClick={() => handleInput('ArrowUp')} />
        <div />
        <ControlButton icon={<ChevronLeft />} onClick={() => handleInput('ArrowLeft')} />
        <ControlButton icon={<ChevronDown />} onClick={() => handleInput('ArrowDown')} />
        <ControlButton icon={<ChevronRight />} onClick={() => handleInput('ArrowRight')} />
      </div>

      {/* Instructions */}
      <div className="mt-8 text-center text-white/30 text-xs tracking-widest uppercase hidden md:block">
        Use WASD or Arrow Keys to navigate the mainframe
      </div>
    </div>
  );
}

function ControlButton({ icon, onClick }: { icon: React.ReactNode, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-xl text-white/50 active:bg-cyan-500/20 active:text-cyan-400 active:border-cyan-400/50 transition-colors cursor-pointer"
    >
      {icon}
    </button>
  );
}
