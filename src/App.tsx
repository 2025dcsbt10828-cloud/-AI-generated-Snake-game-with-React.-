import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Activity, 
  Cpu, 
  Terminal, 
  AlertTriangle,
  Zap,
  HardDrive
} from 'lucide-react';

// --- Types ---
type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
  color: string;
}

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 120;
const SPEED_INCREMENT = 1;
const MIN_SPEED = 40;

const PROTOCOL_STREAMS: Track[] = [
  {
    id: 1,
    title: "ERR_KRNL_PANIC",
    artist: "NODE_01",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    color: "#00ffff"
  },
  {
    id: 2,
    title: "BUFFER_OVFLW",
    artist: "NODE_02",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    color: "#ff00ff"
  },
  {
    id: 3,
    title: "MEM_LEAK_DET",
    artist: "NODE_03",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    color: "#00ff00"
  }
];

// --- Snake Logic Hook ---
function useMachineSnake() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [isCrashed, setIsCrashed] = useState(false);
  const [dataHarvested, setDataHarvested] = useState(0);
  const [maxHarvest, setMaxHarvest] = useState(0);
  const [clockSpeed, setClockSpeed] = useState(INITIAL_SPEED);
  const [isHalted, setIsHalted] = useState(true);

  const directionRef = useRef<Direction>('RIGHT');

  const spawnPayload = useCallback(() => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    setFood(newFood);
  }, [snake]);

  const rebootSystem = () => {
    setSnake([{ x: 10, y: 10 }]);
    directionRef.current = 'RIGHT';
    setIsCrashed(false);
    setDataHarvested(0);
    setClockSpeed(INITIAL_SPEED);
    setIsHalted(false);
    spawnPayload();
  };

  const processStep = useCallback(() => {
    if (isCrashed || isHalted) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const nextSegment = { ...head };

      switch (directionRef.current) {
        case 'UP': nextSegment.y -= 1; break;
        case 'DOWN': nextSegment.y += 1; break;
        case 'LEFT': nextSegment.x -= 1; break;
        case 'RIGHT': nextSegment.x += 1; break;
      }

      if (
        nextSegment.x < 0 || nextSegment.x >= GRID_SIZE ||
        nextSegment.y < 0 || nextSegment.y >= GRID_SIZE ||
        prevSnake.some(segment => segment.x === nextSegment.x && segment.y === nextSegment.y)
      ) {
        setIsCrashed(true);
        if (dataHarvested > maxHarvest) setMaxHarvest(dataHarvested);
        return prevSnake;
      }

      const updatedSnake = [nextSegment, ...prevSnake];

      if (nextSegment.x === food.x && nextSegment.y === food.y) {
        setDataHarvested(d => d + 128);
        setClockSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
        spawnPayload();
      } else {
        updatedSnake.pop();
      }

      return updatedSnake;
    });
  }, [food, isCrashed, isHalted, dataHarvested, maxHarvest, spawnPayload]);

  useEffect(() => {
    const handleInput = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'w': case 'ArrowUp': if (directionRef.current !== 'DOWN') directionRef.current = 'UP'; break;
        case 's': case 'ArrowDown': if (directionRef.current !== 'UP') directionRef.current = 'DOWN'; break;
        case 'a': case 'ArrowLeft': if (directionRef.current !== 'RIGHT') directionRef.current = 'LEFT'; break;
        case 'd': case 'ArrowRight': if (directionRef.current !== 'LEFT') directionRef.current = 'RIGHT'; break;
        case ' ': setIsHalted(h => !h); break;
      }
    };

    window.addEventListener('keydown', handleInput);
    return () => window.removeEventListener('keydown', handleInput);
  }, []);

  useEffect(() => {
    const interval = setInterval(processStep, clockSpeed);
    return () => clearInterval(interval);
  }, [processStep, clockSpeed]);

  return { snake, food, isCrashed, dataHarvested, maxHarvest, isHalted, rebootSystem, setIsHalted };
}

export default function App() {
  const { snake, food, isCrashed, dataHarvested, maxHarvest, isHalted, rebootSystem, setIsHalted } = useMachineSnake();
  
  const [streamIndex, setStreamIndex] = useState(0);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentStream = PROTOCOL_STREAMS[streamIndex];

  const handleSignal = () => {
    if (!audioRef.current) return;
    if (isTransmitting) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsTransmitting(!isTransmitting);
  };

  const cycleStream = (dir: 'fwd' | 'rev') => {
    let next = streamIndex;
    if (dir === 'fwd') {
      next = (streamIndex + 1) % PROTOCOL_STREAMS.length;
    } else {
      next = (streamIndex - 1 + PROTOCOL_STREAMS.length) % PROTOCOL_STREAMS.length;
    }
    setStreamIndex(next);
    setIsTransmitting(true);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentStream.url;
      if (isTransmitting) audioRef.current.play().catch(() => {});
    }
  }, [streamIndex, currentStream.url, isTransmitting]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative">
      <audio ref={audioRef} onEnded={() => cycleStream('fwd')} />

      {/* CRT SCANLINE EFFECT */}
      <div className="fixed inset-0 pointer-events-none z-[200] opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      {/* TOP DECORATIVE UI */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start font-mono text-[10px] md:text-sm tracking-tighter mix-blend-difference">
        <div className="flex flex-col gap-1">
          <p className="text-[#ff00ff]">SYSTEM_STATUS: {isHalted ? 'HALTED' : 'EXECUTING'}</p>
          <p className="text-[#00ffff]">CLOCK_SPEED: {Math.round(1000/120 * 100) / 100} MHZ</p>
          <p suppressHydrationWarning className="text-[#00ff00]">TIMESTAMP: {new Date().toISOString().replace('T', '_').replace('Z', '')}</p>
        </div>
        <div className="text-right flex flex-col gap-1">
          <p className="text-[#ff00ff]">USER_UID: A8X-99</p>
          <p className="text-[#00ffff]">LINK_STRENGTH: 88.4%</p>
        </div>
      </div>

      {/* MAIN CONSOLE WINDOW */}
      <div className="relative w-full max-w-4xl flex flex-col md:flex-row gap-8 items-center justify-center">
        
        {/* LEFT: SIGNAL INTERFACE */}
        <div className="w-full md:w-64 flex flex-col gap-4 border-2 border-[#ff00ff] p-4 bg-black relative">
          <div className="absolute -top-3 -left-1 bg-black px-2 text-[#ff00ff] text-xs font-['Silkscreen']">SIGNAL_CTRL</div>
          
          <div className="aspect-square bg-[#111] border border-[#ff00ff]/30 relative overflow-hidden flex items-center justify-center">
             <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
             <div className="font-['Silkscreen'] text-8xl opacity-10 select-none">DATA</div>
             
             {/* JARRED VISUALIZER */}
             <div className="absolute inset-x-4 bottom-4 flex items-end gap-1 h-24">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: isTransmitting ? [4, Math.random() * 80 + 4, 4] : 4 }}
                    transition={{ repeat: Infinity, duration: 0.2 + Math.random() * 0.3 }}
                    className="flex-1 bg-[#ff00ff] shadow-[0_0_10px_#ff00ff]"
                  />
                ))}
             </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-['Silkscreen'] text-[#00ffff] truncate uppercase leading-tight">{currentStream.title}</h2>
            <div className="flex justify-between items-center text-[10px] uppercase text-[#ff00ff]/60 tracking-widest leading-none">
              <span>{currentStream.artist}</span>
              <Activity size={12} className={isTransmitting ? 'animate-pulse' : ''} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => cycleStream('rev')}
              className="border border-[#ff00ff] p-3 hover:bg-[#ff00ff] hover:text-black transition-colors"
            >
              <SkipBack size={18} />
            </button>
            <button 
              onClick={handleSignal}
              className="border-2 border-[#00ffff] bg-black p-3 hover:bg-[#00ffff] hover:text-black transition-colors flex justify-center items-center shadow-[4px_4px_0_#ff00ff]"
            >
              {isTransmitting ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button 
              onClick={() => cycleStream('fwd')}
              className="border border-[#ff00ff] p-3 hover:bg-[#ff00ff] hover:text-black transition-colors"
            >
              <SkipForward size={18} />
            </button>
          </div>
        </div>

        {/* CENTER: CORE ENGINE FRAME */}
        <div className="relative group">
          {/* GLITCH SHADOWS */}
          <div className="absolute inset-0 border-4 border-[#00ffff] translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
          <div className="absolute inset-0 border-4 border-[#ff00ff] -translate-x-2 -translate-y-2 -z-10 group-hover:-translate-x-3 group-hover:-translate-y-3 transition-transform" />
          
          <div className="bg-black border-4 border-[#fff] p-2 relative">
            <div className="flex justify-between items-center mb-2 px-1 font-['Silkscreen'] text-[10px]">
              <div className="flex items-center gap-2">
                <Cpu size={12} className="text-[#00ffff]" />
                <span>EXE_STREAM_001</span>
              </div>
              <div className="flex gap-4">
                <span className="text-[#00ffff]">DATA: {dataHarvested}</span>
                <span className="text-[#ff00ff]">MAX: {maxHarvest}</span>
              </div>
            </div>

            {/* GRID AREA */}
            <div 
              className="relative bg-[#050505] border-2 border-white/20 overflow-hidden"
              style={{
                width: GRID_SIZE * 18,
                height: GRID_SIZE * 18,
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                backgroundImage: 'linear-gradient(to right, rgba(255,0,0,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '18px 18px'
              }}
            >
              {/* SNAKE SEGMENTS */}
              {snake.map((segment, i) => (
                <div
                  key={i}
                  style={{
                    gridColumnStart: segment.x + 1,
                    gridRowStart: segment.y + 1,
                  }}
                  className={`
                    w-full h-full border border-black transition-all duration-75
                    ${i === 0 
                      ? 'bg-[#00ffff] shadow-[0_0_15px_#00ffff]' 
                      : 'bg-[#ff00ff]'
                    }
                  `}
                />
              ))}

              {/* PAYLOAD / FOOD */}
              <div
                style={{
                  gridColumnStart: food.x + 1,
                  gridRowStart: food.y + 1
                }}
                className="w-full h-full bg-[#fff] animate-ping"
              />

              {/* CRASH OVERLAY */}
              <AnimatePresence>
                {isCrashed && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-50 bg-[#ff00ff] text-black flex flex-col items-center justify-center text-center p-4 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 p-1 text-[8px] opacity-30 font-mono overflow-hidden h-full pointer-events-none">
                      {Array(500).fill('SEG_FAULT ').join('')}
                    </div>
                    <AlertTriangle size={64} className="mb-4 animate-bounce" />
                    <h3 className="text-4xl font-['Silkscreen'] mb-2 tracking-tighter">CRITICAL_OVERFLOW</h3>
                    <p className="text-sm mb-6 max-w-[200px] leading-tight font-bold">SYSTEM CRASHED. BUFFER REFLOW DETECTED AT SECTOR {dataHarvested}.</p>
                    <button 
                      onClick={rebootSystem}
                      className="px-10 py-4 bg-black text-[#00ffff] border-2 border-[#00ffff] font-['Silkscreen'] hover:bg-[#00ffff] hover:text-black transition-all flex items-center gap-3 active:scale-95"
                    >
                      <Zap size={20} fill="currentColor" />
                      REBOOT_EXEC
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* HALT OVERLAY */}
              <AnimatePresence>
                {!isCrashed && isHalted && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-40 bg-black/60 flex flex-col items-center justify-center cursor-pointer"
                    onClick={() => setIsHalted(false)}
                  >
                    <div className="flex flex-col items-center gap-4">
                       <div className="p-8 border-4 border-[#00ffff] hover:bg-[#00ffff] hover:text-black transition-all group/play">
                          <Play size={48} className="fill-current" />
                       </div>
                       <span className="font-['Silkscreen'] text-[#00ffff] text-xs animate-pulse">INIT_PROCESS [SPACE]</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT: HARDWARE METRICS */}
        <div className="w-full md:w-64 flex flex-col gap-4 border-2 border-[#00ffff] p-4 bg-black relative">
           <div className="absolute -top-3 -right-1 bg-black px-2 text-[#00ffff] text-xs font-['Silkscreen']">DATA_METRICS</div>
           
           <div className="space-y-6">
              <div className="space-y-2">
                 <div className="flex justify-between items-center text-[10px] font-['Silkscreen']">
                    <span>CPU_LOAD</span>
                    <span>{isHalted ? '0%' : '94%'}</span>
                 </div>
                 <div className="h-4 bg-[#111] border border-[#00ffff]/30 p-0.5">
                    <motion.div 
                      initial={{ width: '0%' }}
                      animate={{ width: isHalted ? '0%' : '94%' }}
                      className="h-full bg-[#00ffff] shadow-[0_0_10px_#00ffff]"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between items-center text-[10px] font-['Silkscreen']">
                    <span>MEM_RESERVE</span>
                    <span>1.2GB / 16GB</span>
                 </div>
                 <div className="h-4 bg-[#111] border border-[#ff00ff]/30 p-0.5">
                    <div className="h-full bg-[#ff00ff] w-[14%]" />
                 </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                 <div className="flex items-center gap-2 text-[#ff00ff]">
                    <Terminal size={12} />
                    <span className="text-[10px] font-['Silkscreen'] tracking-tighter">LOG_STREAM:</span>
                 </div>
                 <div className="h-24 bg-[#050505] border border-white/5 p-2 font-mono text-[8px] text-white/40 overflow-hidden leading-tight">
                    <div className="animate-[scrollLog_2s_linear_infinite]">
                      <p>&gt; INIT_SYS</p>
                      <p>&gt; ALLOC_MEM 0x001</p>
                      <p>&gt; PROC_STRT</p>
                      <p>&gt; DATA_SYNC_OK</p>
                      <p>&gt; VOLTAGE_NOMINAL</p>
                      <p>&gt; HARVEST_DATA {dataHarvested}</p>
                      <p>&gt; PKT_RECV_001</p>
                      <p>&gt; PKT_RECV_002</p>
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-2 text-[#00ffff]/40">
                 <HardDrive size={14} />
                 <span className="text-[9px] uppercase tracking-widest">DRIVE_C: MOUNTED</span>
              </div>
           </div>
        </div>

      </div>

      {/* FOOTER BAR */}
      <footer className="mt-auto w-full max-w-4xl py-6 flex flex-col md:flex-row items-center gap-4 justify-between border-t border-[#fff]/10 font-['Silkscreen'] text-xs mix-blend-difference">
         <div className="flex items-center gap-4">
            <span className="text-[#00ffff] glitch-noise uppercase">PROTOCOL_v4.0.1</span>
            <div className="w-1 h-4 bg-[#ff00ff]" />
            <span className="text-white opacity-40 uppercase">ZONE_ID: 19-SEC-B</span>
         </div>
         <div className="text-[#ff00ff] animate-pulse">
            &lt; WARNING: MONITORING ACTIVE &gt;
         </div>
         <div className="hidden md:block text-white opacity-20">
            [C] 1982 SYNC_CORP
         </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scrollLog {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
      `}} />
    </div>
  );
}
