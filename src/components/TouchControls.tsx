import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Zap, ArrowDown, Rocket, ArrowUpCircle } from 'lucide-react';

interface TouchControlsProps {
  onSteer: (dir: number) => void;
  onThrottle: (active: boolean) => void;
  onBrake: (active: boolean) => void;
  onJump: () => void;
  onShoot: () => void;
  jumpReady: boolean;
  shootCooldown: number; // 0 (ready) to 1 (reloading)
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onSteer,
  onThrottle,
  onBrake,
  onJump,
  onShoot,
  jumpReady,
  shootCooldown,
}) => {
  const [steerState, setSteerState] = useState<number>(0);
  const [throttleState, setThrottleState] = useState<boolean>(false);
  const [brakeState, setBrakeState] = useState<boolean>(false);

  const handleSteerLeftStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setSteerState(-1);
    onSteer(-1);
  };

  const handleSteerRightStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setSteerState(1);
    onSteer(1);
  };

  const handleSteerEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setSteerState(0);
    onSteer(0);
  };

  const handleThrottleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setThrottleState(true);
    onThrottle(true);
  };

  const handleThrottleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setThrottleState(false);
    onThrottle(false);
  };

  const handleBrakeStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setBrakeState(true);
    onBrake(true);
  };

  const handleBrakeEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setBrakeState(false);
    onBrake(false);
  };

  const handleJumpPress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onJump();
  };

  const handleShootPress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onShoot();
  };

  return (
    <div
      id="mobile-touch-controls-container"
      className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end p-3 sm:p-6 select-none"
    >
      <div className="w-full flex justify-between items-end gap-3 max-w-6xl mx-auto">
        {/* Left Side: Steering Pad */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/70 backdrop-blur-md p-2 rounded-2xl border border-slate-700/60 shadow-xl">
          {/* Steer Left */}
          <button
            id="btn-steer-left"
            className={`touch-btn w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center transition-all duration-75 active:scale-95 border-2 ${
              steerState === -1
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/40'
                : 'bg-slate-800/90 text-amber-400 border-slate-700 active:bg-amber-500/40'
            }`}
            onTouchStart={handleSteerLeftStart}
            onTouchEnd={handleSteerEnd}
            onMouseDown={handleSteerLeftStart}
            onMouseUp={handleSteerEnd}
            onMouseLeave={handleSteerEnd}
            aria-label="Girar a la izquierda"
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="text-[10px] font-racing font-bold tracking-wider -mt-1">IZQ</span>
          </button>

          {/* Steer Right */}
          <button
            id="btn-steer-right"
            className={`touch-btn w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center transition-all duration-75 active:scale-95 border-2 ${
              steerState === 1
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/40'
                : 'bg-slate-800/90 text-amber-400 border-slate-700 active:bg-amber-500/40'
            }`}
            onTouchStart={handleSteerRightStart}
            onTouchEnd={handleSteerEnd}
            onMouseDown={handleSteerRightStart}
            onMouseUp={handleSteerEnd}
            onMouseLeave={handleSteerEnd}
            aria-label="Girar a la derecha"
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="text-[10px] font-racing font-bold tracking-wider -mt-1">DER</span>
          </button>
        </div>

        {/* Right Side: Action Clusters (Jump, Shoot, Brake, Gas) */}
        <div className="pointer-events-auto flex items-end gap-3">
          {/* Combat & Acrobatics: Jump + Shoot */}
          <div className="flex flex-col gap-2.5">
            {/* Shoot Rocket / Disparo */}
            <button
              id="btn-shoot-rockets"
              className={`touch-btn relative w-16 h-14 sm:w-20 sm:h-16 rounded-xl flex flex-col items-center justify-center font-racing font-bold transition-all duration-75 active:scale-90 border-2 overflow-hidden ${
                shootCooldown > 0
                  ? 'bg-slate-800 text-slate-500 border-slate-700'
                  : 'bg-gradient-to-t from-red-600 to-rose-500 text-white border-rose-400 shadow-lg shadow-red-500/40 active:from-red-500'
              }`}
              onTouchStart={handleShootPress}
              onMouseDown={handleShootPress}
              aria-label="Disparar a rivales"
            >
              {shootCooldown > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-slate-950/60 transition-all duration-75"
                  style={{ height: `${shootCooldown * 100}%` }}
                />
              )}
              <Rocket className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" />
              <span className="text-[10px] font-racing tracking-wider leading-none relative z-10 mt-0.5">
                {shootCooldown > 0 ? 'CARGA' : 'DISPARO'}
              </span>
            </button>

            {/* Jump / Salto */}
            <button
              id="btn-car-jump"
              className={`touch-btn relative w-16 h-14 sm:w-20 sm:h-16 rounded-xl flex flex-col items-center justify-center font-racing font-bold transition-all duration-75 active:scale-90 border-2 ${
                jumpReady
                  ? 'bg-gradient-to-t from-cyan-600 to-sky-500 text-white border-cyan-300 shadow-lg shadow-cyan-500/40 active:from-cyan-400'
                  : 'bg-slate-800 text-slate-500 border-slate-700 opacity-60'
              }`}
              onTouchStart={handleJumpPress}
              onMouseDown={handleJumpPress}
              aria-label="Saltar con el carro"
            >
              <ArrowUpCircle className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="text-[10px] font-racing tracking-wider leading-none mt-0.5">SALTO</span>
            </button>
          </div>

          {/* Driving: Brake + Throttle */}
          <div className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-md p-2 rounded-2xl border border-slate-700/60 shadow-xl">
            {/* Brake / Reverse */}
            <button
              id="btn-brake-reverse"
              className={`touch-btn w-14 h-16 sm:w-16 sm:h-20 rounded-xl flex flex-col items-center justify-center font-racing font-bold transition-all duration-75 active:scale-95 border-2 ${
                brakeState
                  ? 'bg-red-500 text-white border-red-300 shadow-lg shadow-red-500/40'
                  : 'bg-slate-800/90 text-rose-400 border-slate-700 active:bg-red-500/30'
              }`}
              onTouchStart={handleBrakeStart}
              onTouchEnd={handleBrakeEnd}
              onMouseDown={handleBrakeStart}
              onMouseUp={handleBrakeEnd}
              onMouseLeave={handleBrakeEnd}
              aria-label="Frenar o Reversa"
            >
              <ArrowDown className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="text-[10px] font-racing tracking-wider mt-0.5">FRENO</span>
            </button>

            {/* Throttle / Gas */}
            <button
              id="btn-throttle-gas"
              className={`touch-btn w-18 h-18 sm:w-22 sm:h-22 rounded-xl flex flex-col items-center justify-center font-racing font-extrabold transition-all duration-75 active:scale-95 border-2 ${
                throttleState
                  ? 'bg-gradient-to-t from-emerald-500 to-green-400 text-slate-950 border-emerald-300 shadow-xl shadow-emerald-500/50'
                  : 'bg-gradient-to-t from-emerald-600 to-green-500 text-white border-emerald-400/80 shadow-lg shadow-emerald-500/20 active:from-emerald-400'
              }`}
              onTouchStart={handleThrottleStart}
              onTouchEnd={handleThrottleEnd}
              onMouseDown={handleThrottleStart}
              onMouseUp={handleThrottleEnd}
              onMouseLeave={handleThrottleEnd}
              aria-label="Acelerar"
            >
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
              <span className="text-xs sm:text-sm font-racing tracking-wider mt-0.5">GAS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
