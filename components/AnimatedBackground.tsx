"use client";

import { useEffect, useRef } from "react";

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    const mouse = { x: 0, y: 0 };

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const W = () => canvas.width;
    const H = () => canvas.height;

    // HEXAGONS
    class Hex {
      cx: number; cy: number; s: number;
      pulse: number; speed: number; baseAlpha: number;
      litProgress: number;
      constructor(x: number, y: number, s: number) {
        this.cx = x; this.cy = y; this.s = s;
        this.pulse = Math.random() * Math.PI * 2;
        this.speed = 0.005 + Math.random() * 0.01;
        this.baseAlpha = 0.02 + Math.random() * 0.04;
        this.litProgress = 0;
      }
      update() {
        this.pulse += this.speed;
        const dx = mouse.x - this.cx, dy = mouse.y - this.cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const lit = dist < 110;
        if (lit) this.litProgress = Math.min(1, this.litProgress + 0.08);
        else this.litProgress = Math.max(0, this.litProgress - 0.04);
      }
      draw() {
        const a = this.baseAlpha + 0.015 * Math.sin(this.pulse);
        const litA = this.litProgress * 0.18;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 180 * (60 * i - 30);
          const px = this.cx + this.s * Math.cos(angle);
          const py = this.cy + this.s * Math.sin(angle);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        if (litA > 0.01) { ctx.fillStyle = `rgba(255,107,43,${litA})`; ctx.fill(); }
        ctx.strokeStyle = `rgba(255,107,43,${a + litA * 0.8})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // PARTICLES
    class Particle {
      x: number; y: number; vx: number; vy: number;
      life: number; maxLife: number; r: number;
      color: number[]; trail: {x:number,y:number}[];
      constructor() { this.color=[255,107,43]; this.trail=[]; this.life=0; this.maxLife=1; this.r=1; this.x=0; this.y=0; this.vx=0; this.vy=0; this.reset(true); }
      reset(init: boolean) {
        this.x = init ? Math.random()*W() : (Math.random()<0.5?0:W());
        this.y = init ? Math.random()*H() : Math.random()*H();
        this.vx = (Math.random()-0.5)*0.5;
        this.vy = (Math.random()-0.5)*0.5;
        this.life = 0; this.maxLife = 200+Math.random()*300;
        this.r = 0.8+Math.random()*2.2; this.trail = [];
        const t = Math.random();
        if(t<0.55) this.color=[255,107,43];
        else if(t<0.75) this.color=[124,58,237];
        else if(t<0.90) this.color=[6,182,212];
        else this.color=[255,255,255];
      }
      update() {
        const dx=mouse.x-this.x, dy=mouse.y-this.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist>80){this.vx+=dx/dist*0.003;this.vy+=dy/dist*0.003;}
        this.vx*=0.99; this.vy*=0.99;
        this.trail.unshift({x:this.x,y:this.y});
        if(this.trail.length>8) this.trail.pop();
        this.x+=this.vx; this.y+=this.vy; this.life++;
        if(this.life>this.maxLife||this.x<-20||this.x>W()+20||this.y<-20||this.y>H()+20) this.reset(false);
      }
      draw() {
        const progress=this.life/this.maxLife;
        const alpha=progress<0.1?progress*10:(progress>0.85?(1-progress)/0.15:1);
        const [r,g,b]=this.color;
        this.trail.forEach((pt,i)=>{
          ctx.beginPath();ctx.arc(pt.x,pt.y,this.r*(1-i/8)*0.7,0,Math.PI*2);
          ctx.fillStyle=`rgba(${r},${g},${b},${alpha*(1-i/8)*0.4})`;ctx.fill();
        });
        const grd=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r*5);
        grd.addColorStop(0,`rgba(${r},${g},${b},${alpha*0.4})`);
        grd.addColorStop(1,`rgba(${r},${g},${b},0)`);
        ctx.fillStyle=grd;ctx.beginPath();ctx.arc(this.x,this.y,this.r*5,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;ctx.fill();
      }
    }

    // RINGS
    class Ring {
      x: number; y: number; r: number; maxR: number;
      speed: number; alpha: number; color: string;
      constructor() { this.x=0;this.y=0;this.r=0;this.maxR=1;this.speed=1;this.alpha=1;this.color='255,107,43'; this.reset(); }
      reset() {
        this.x=W()*0.5+(Math.random()-0.5)*W()*0.3;
        this.y=H()*0.5+(Math.random()-0.5)*H()*0.3;
        this.r=0;this.maxR=60+Math.random()*120;
        this.speed=0.4+Math.random()*0.6;
        this.alpha=0.5+Math.random()*0.4;
        const t=Math.random();
        this.color=t<0.6?'255,107,43':(t<0.8?'124,58,237':'6,182,212');
      }
      update() { this.r+=this.speed; if(this.r>this.maxR) this.reset(); }
      draw() {
        const a=this.alpha*(1-this.r/this.maxR);
        ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${this.color},${a*0.7})`;ctx.lineWidth=1;ctx.stroke();
      }
    }

    // SHOOTING STARS
    class Shoot {
      x: number; y: number; len: number; speed: number;
      angle: number; alpha: number; life: number;
      maxLife: number; color: string; active: boolean;
      constructor(){this.x=0;this.y=0;this.len=60;this.speed=4;this.angle=0;this.alpha=0;this.life=0;this.maxLife=40;this.color='255,107,43';this.active=false;this.reset();}
      reset() {
        this.x=Math.random()*W();this.y=Math.random()*H()*0.5;
        this.len=40+Math.random()*80;this.speed=3+Math.random()*4;
        this.angle=Math.PI/6+Math.random()*Math.PI/6;
        this.alpha=0;this.life=0;this.maxLife=40+Math.random()*30;
        this.color=Math.random()<0.7?'255,107,43':'255,255,255';
        this.active=Math.random()<0.015;
      }
      update() {
        if(!this.active){if(Math.random()<0.004)this.active=true;return;}
        this.life++;
        this.x+=Math.cos(this.angle)*this.speed;
        this.y+=Math.sin(this.angle)*this.speed;
        this.alpha=this.life<10?this.life/10:(this.life>this.maxLife-10?(this.maxLife-this.life)/10:1);
        if(this.life>this.maxLife)this.reset();
      }
      draw() {
        if(!this.active||this.alpha<=0)return;
        ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);
        const grd=ctx.createLinearGradient(-this.len,0,0,0);
        grd.addColorStop(0,`rgba(${this.color},0)`);
        grd.addColorStop(1,`rgba(${this.color},${this.alpha*0.9})`);
        ctx.strokeStyle=grd;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(-this.len,0);ctx.lineTo(0,0);ctx.stroke();
        ctx.restore();
      }
    }

    // BUILD SCENE
    let hexes: Hex[] = [];
    let particles: Particle[] = Array.from({length:90},()=>new Particle());
    let rings: Ring[] = Array.from({length:12},()=>{const r=new Ring();r.r=Math.random()*r.maxR;return r;});
    let shoots: Shoot[] = Array.from({length:8},()=>new Shoot());

    function buildHexes() {
      hexes = [];
      const s=28, hx=s*Math.sqrt(3), hy=s*1.5;
      const cols=Math.ceil(W()/hx)+2, rows=Math.ceil(H()/hy)+2;
      for(let row=0;row<rows;row++)
        for(let col=0;col<cols;col++)
          hexes.push(new Hex(col*hx+(row%2?hx/2:0), row*hy, s));
    }
    buildHexes();

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0,0,W(),H());
      ctx.fillStyle='#05050f';ctx.fillRect(0,0,W(),H());
      const cg=ctx.createRadialGradient(W()/2,H()/2,0,W()/2,H()/2,W()*0.55);
      cg.addColorStop(0,'rgba(255,107,43,0.05)');
      cg.addColorStop(0.5,'rgba(124,58,237,0.03)');
      cg.addColorStop(1,'rgba(5,5,15,0)');
      ctx.fillStyle=cg;ctx.fillRect(0,0,W(),H());
      hexes.forEach(h=>{h.update();h.draw();});
      rings.forEach(r=>{r.update();r.draw();});
      particles.forEach(p=>{p.update();p.draw();});
      shoots.forEach(s=>{s.update();s.draw();});
      const mg=ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,100);
      mg.addColorStop(0,'rgba(255,107,43,0.06)');
      mg.addColorStop(1,'rgba(255,107,43,0)');
      ctx.fillStyle=mg;ctx.fillRect(0,0,W(),H());
      const ef=ctx.createRadialGradient(W()/2,H()/2,H()*0.28,W()/2,H()/2,W()*0.72);
      ef.addColorStop(0,'rgba(5,5,15,0)');
      ef.addColorStop(1,'rgba(5,5,15,0.85)');
      ctx.fillStyle=ef;ctx.fillRect(0,0,W(),H());
      const bf=ctx.createLinearGradient(0,H()*0.65,0,H());
      bf.addColorStop(0,'rgba(5,5,15,0)');
      bf.addColorStop(1,'rgba(5,5,15,1)');
      ctx.fillStyle=bf;ctx.fillRect(0,H()*0.65,W(),H()*0.35);
      animId=requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100vw',height:'100vh',zIndex:0,pointerEvents:'none'}} />;
}
