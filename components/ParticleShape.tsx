
import React, { useEffect, useRef } from 'react';
import { VisualEffectType } from '../types';

interface ParticleShapeProps {
  type: VisualEffectType;
}

const ParticleShape: React.FC<ParticleShapeProps> = ({ type }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // --- Particle Definitions ---
    interface BaseParticle {
      x: number;
      y: number;
      color: string;
      size: number;
      alpha: number;
      life: number; // 0 to 1
    }

    interface FireworkParticle extends BaseParticle {
      vx: number;
      vy: number;
      mode: 'rocket' | 'explode';
    }

    // Butterfly particles act as points on a shape
    interface ButterflyParticle extends BaseParticle {
        originT: number; // The 't' value in parametric equation
        randomOffset: number; // Slight jitter
    }

    let particles: any[] = [];
    let animationId: number;
    let time = 0;

    // --- Butterfly Logic Variables ---
    // We use a parametric equation for a butterfly curve
    // x = sin(t) * (e^cos(t) - 2cos(4t) - sin(t/12)^5)
    // y = cos(t) * (e^cos(t) - 2cos(4t) - sin(t/12)^5)
    let butterflyCenter = { x: -100, y: height / 2 }; 
    const butterflySpeed = 1.5;

    const init = () => {
      particles = [];
      time = 0;

      if (type === 'firework') {
        // Initialize one rocket
        createRocket();
      } else if (type === 'butterfly') {
        // Create 400 tiny particles along the butterfly curve
        const count = 400; 
        for (let i = 0; i < count; i++) {
           // Distribute t from 0 to 12*PI for full butterfly shape
           const t = (i / count) * 12 * Math.PI; 
           particles.push({
               originT: t,
               randomOffset: Math.random() * 2,
               size: Math.random() * 1.5 + 0.5, // Tiny "star dust" size
               color: `hsl(${200 + Math.random() * 40}, 100%, 80%)`, // Light blues/whites
               alpha: Math.random() * 0.5 + 0.5
           } as ButterflyParticle);
        }
      } else {
        // Generic particles (Cat/Heart fallback)
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 2,
                color: type === 'heart' ? '#ffc0cb' : '#ffffff',
                alpha: Math.random(),
                life: 1
            });
        }
      }
    };

    const createRocket = () => {
        particles.push({
            x: Math.random() * (width * 0.6) + (width * 0.2), // Center-ish
            y: height,
            vx: (Math.random() - 0.5) * 1,
            vy: -(Math.random() * 4 + 10), // Shoot up fast
            size: 3,
            color: '#fff',
            alpha: 1,
            life: 1,
            mode: 'rocket'
        } as FireworkParticle);
    };

    const explode = (x: number, y: number) => {
        const colors = ['#ff0044', '#00ffcc', '#ffff00', '#ff00ff', '#ffffff'];
        const baseColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Create explosion particles
        for(let i=0; i<150; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 6; // Random spread
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: Math.random() * 2, // Tiny particles
                color: baseColor,
                alpha: 1,
                life: 1,
                mode: 'explode'
            } as FireworkParticle);
        }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      if (type === 'firework') {
          // Firework Physics
          if (particles.length === 0 && Math.random() < 0.05) {
              createRocket(); // Launch new one occasionally
          }

          for (let i = particles.length - 1; i >= 0; i--) {
              const p = particles[i] as FireworkParticle;
              
              if (p.mode === 'rocket') {
                  p.x += p.vx;
                  p.y += p.vy;
                  p.vy += 0.15; // Gravity
                  
                  // Trail
                  ctx.globalAlpha = 0.5;
                  ctx.fillStyle = '#fff';
                  ctx.fillRect(p.x, p.y + 5, 2, 10); 

                  if (p.vy >= -1) { // Peak reached
                      explode(p.x, p.y);
                      particles.splice(i, 1);
                  } else {
                      // Draw rocket head
                      ctx.globalAlpha = 1;
                      ctx.beginPath();
                      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                      ctx.fillStyle = p.color;
                      ctx.fill();
                  }

              } else {
                  // Explosion particles
                  p.x += p.vx;
                  p.y += p.vy;
                  p.vy += 0.05; // Gravity
                  p.vx *= 0.96; // Air resistance
                  p.vy *= 0.96;
                  p.life -= 0.015; // Fade out

                  if (p.life <= 0) {
                      particles.splice(i, 1);
                  } else {
                      ctx.globalAlpha = p.life;
                      ctx.beginPath();
                      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                      ctx.fillStyle = p.color;
                      // Glow effect
                      ctx.shadowBlur = 5;
                      ctx.shadowColor = p.color;
                      ctx.fill();
                      ctx.shadowBlur = 0;
                  }
              }
          }
      } 
      else if (type === 'butterfly') {
          time += 0.1;
          
          // Move the butterfly center across screen
          butterflyCenter.x += butterflySpeed;
          butterflyCenter.y += Math.sin(time * 0.1) * 2; // Gentle bobbing

          // Wrap around screen
          if (butterflyCenter.x > width + 100) {
              butterflyCenter.x = -100;
              butterflyCenter.y = Math.random() * (height * 0.8) + (height * 0.1);
          }

          // Flapping Factor (Rhythmic scaling of X)
          // Use Sine wave to simulate opening/closing wings
          const flap = Math.abs(Math.sin(time * 0.5)); 

          particles.forEach((p: ButterflyParticle) => {
              // Calculate Butterfly Curve Position relative to 0,0
              const t = p.originT;
              const preFactor = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5);
              
              // Raw butterfly coordinates
              let bx = Math.sin(t) * preFactor;
              let by = Math.cos(t) * preFactor;

              // Apply Flap (Squash X)
              bx = bx * flap;

              // Scale up the butterfly (it's too small by default)
              const scale = 15; 
              bx *= scale;
              by *= scale; // Note: Butterfly curve is upright by default usually, might need rotation
              
              // Rotate -90deg to fly right
              // Standard 2D rotation: x' = x cos - y sin, y' = x sin + y cos
              // Rotate -PI/2
              const rotatedX = by; 
              const rotatedY = -bx;

              // Translate to Center
              const finalX = butterflyCenter.x + rotatedX + (Math.random() - 0.5) * 2; // + Jitter
              const finalY = butterflyCenter.y + rotatedY + (Math.random() - 0.5) * 2;

              // Draw Star-like particle
              ctx.globalAlpha = p.alpha * (0.5 + flap * 0.5); // Flash slightly when wings open
              ctx.beginPath();
              ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.shadowBlur = 4;
              ctx.shadowColor = p.color;
              ctx.fill();
              ctx.shadowBlur = 0;
          });
      }
      else {
          // Default fallbacks (Heart / Cat) - kept simple but smoother
           particles.forEach(p => {
               p.x += p.vx * 0.5;
               p.y += p.vy * 0.5;
               // Bounce
               if(p.x < 0 || p.x > width) p.vx *= -1;
               if(p.y < 0 || p.y > height) p.vy *= -1;

               ctx.globalAlpha = Math.abs(Math.sin(Date.now() * 0.002));
               ctx.beginPath();
               ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
               ctx.fillStyle = p.color;
               ctx.fill();
           });
      }

      animationId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        init();
    };

    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationId);
    };
  }, [type]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export default ParticleShape;
