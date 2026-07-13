import React from 'react';

const ParticleBackground = React.memo(function ParticleBackground() {
  return (
    <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none bg-[#0A0E17] overflow-hidden">
      {/* 
        A very lightweight CSS-only alternative to the canvas particle system. 
        Uses absolute positioned radial gradients to simulate a subtle glowing background
        without any JS overhead.
      */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/5 blur-[120px]" />
    </div>
  );
});

export default ParticleBackground;
