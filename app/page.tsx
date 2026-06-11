"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [stars, setStars] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Generate stars for the hero section background after mount to avoid hydration mismatch
    const generatedStars = Array.from({ length: 25 }).map(() => ({
      width: Math.random() * 2 + 'px',
      height: Math.random() * 2 + 'px',
      top: Math.random() * 100 + '%',
      left: Math.random() * 100 + '%',
      animationDelay: Math.random() * 4 + 's',
      animationDuration: (Math.random() * 3 + 2) + 's'
    }));
    setStars(generatedStars);

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    
    async function fetchFeedbacks() {
      try {
        const res = await fetch('/api/feedbacks');
        if (res.ok) {
          const data = await res.json();
          setFeedbacks(data.feedbacks || []);
        }
      } catch (err) {
        console.error("Failed to fetch feedbacks", err);
      }
    }
    fetchFeedbacks();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const canvas = document.getElementById('hc-hero-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    let frame = 0;
    const mouse = { x: 0, y: 0 };

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

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
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col font-sans bg-[#09090b] relative">
      <canvas id="hc-hero-canvas" style={{position:'fixed',inset:0,width:'100vw',height:'100vh',zIndex:0,pointerEvents:'none'}} />
      <div style={{position:'relative',zIndex:10}} className="flex flex-col flex-1 w-full">
      {/* 1. NAVBAR */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-1 text-xl font-bold tracking-tight" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <img src="/logo-colored.png" alt="Logo" className="h-7 w-auto sm:h-8 -mr-1" />
              <div className="flex">
                <span className="text-white">Hacker</span>
                <span className="text-accent">Compliment</span>
              </div>
            </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="nl text-sm font-medium text-zinc-300 hover:text-white">Features</a>
            <a href="#how-it-works" className="nl text-sm font-medium text-zinc-300 hover:text-white">How It Works</a>
            <a href="#pricing" className="nl text-sm font-medium text-zinc-300 hover:text-white">Pricing</a>
            <a href="#companies" className="nl text-sm font-medium text-zinc-300 hover:text-white">Companies</a>
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login" className="text-sm font-bold text-zinc-300 transition-colors hover:text-white">
              Log In
            </Link>
            <Link href="/signup" className="shimmer inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-zinc-950 transition-transform hover:scale-105">
              Get Started Free
            </Link>
          </div>
          
          <button className="md:hidden text-zinc-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-6 md:hidden flex flex-col gap-4">
            <a href="#features" className="text-lg font-medium text-zinc-300" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="text-lg font-medium text-zinc-300" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#pricing" className="text-lg font-medium text-zinc-300" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#companies" className="text-lg font-medium text-zinc-300" onClick={() => setMobileMenuOpen(false)}>Companies</a>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/login" className="rounded-full border border-zinc-700 bg-transparent px-6 py-3 text-center font-bold text-white transition-colors hover:bg-zinc-900" onClick={() => setMobileMenuOpen(false)}>
                Log In
              </Link>
              <Link href="/signup" className="rounded-full bg-accent px-6 py-3 text-center font-bold text-zinc-950 transition-transform hover:scale-[1.02]" onClick={() => setMobileMenuOpen(false)}>
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <section className="relative flex min-h-screen items-center justify-center px-6 pt-20 overflow-hidden">
          <div className="w-full flex items-center justify-center min-h-screen">
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-block rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent">
              🚀 AI-Powered Interview Prep
            </div>
            
            <h1 className="mb-6 font-['PT_Sans'] text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl">
              Crack Every Interview<br />
              <span className="text-accent">With AI by Your Side</span>
            </h1>
            
            <p className="mx-auto mb-10 max-w-xl text-lg text-zinc-400">
              Practice with real company questions from TCS, Wipro, Infosys, Amazon and more. Get instant AI feedback tailored for students and freshers.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup" className="shimmer flex items-center justify-center rounded-full bg-accent px-8 py-4 text-base font-bold text-zinc-950 w-full sm:w-auto">
                Start Practicing Free →
              </Link>
              <a href="#how-it-works" className="flex items-center justify-center rounded-full border border-zinc-700 px-8 py-4 text-base font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white w-full sm:w-auto">
                See How It Works
              </a>
            </div>

            <div className="mt-14 border-t border-zinc-800/60 pt-8 flex flex-wrap justify-center gap-12 sm:gap-24">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white">50+</span>
                <span className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-wider">Companies Covered</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white">3</span>
                <span className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-wider">Free Sessions Weekly</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white">AI</span>
                <span className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-wider">Powered Feedback</span>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* 3. COMPANIES SECTION */}
        <section id="companies" className="py-16 px-6 relative z-10 border-y border-zinc-900 bg-zinc-950/50">
          <div className="mx-auto max-w-6xl text-center">
            <p className="mb-8 text-sm font-medium text-zinc-500">Trusted by students preparing for</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {['TCS', 'Wipro', 'Infosys', 'Amazon', 'Google', 'Deloitte', 'Accenture', 'Cognizant'].map(company => (
                <div key={company} className="rounded-full border border-zinc-800 bg-zinc-900/40 px-6 py-2 text-sm font-medium text-zinc-400">
                  {company}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. FEATURES SECTION */}
        <section id="features" className="py-24 px-6 bg-zinc-900/40">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">FEATURES</span>
              <h2 className="mt-4 font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl">Everything you need to ace your interview</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="card-h rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
                <div className="mb-6 text-4xl">🎯</div>
                <h3 className="mb-3 text-xl font-bold text-white">Technical Round</h3>
                <p className="text-zinc-400 leading-relaxed">Practice with real company interview patterns for HR, Technical, and Behavioral rounds.</p>
              </div>
              
              <div className="card-h rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
                <div className="mb-6 text-4xl">🤖</div>
                <h3 className="mb-3 text-xl font-bold text-white">AI Mock Interview</h3>
                <p className="text-zinc-400 leading-relaxed">Experience a full-length comprehensive mock interview to test your endurance and knowledge.</p>
              </div>

              <div className="card-h rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
                <div className="mb-6 text-4xl">💻</div>
                <h3 className="mb-3 text-xl font-bold text-white">Coding Practice</h3>
                <p className="text-zinc-400 leading-relaxed">Practice real Data Structures and Algorithms (DSA) problems asked by top companies.</p>
              </div>

              <div className="card-h rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
                <div className="mb-6 text-4xl">📄</div>
                <h3 className="mb-3 text-xl font-bold text-white">Resume Analyzer</h3>
                <p className="text-zinc-400 leading-relaxed">Get ATS score, keyword analysis, and AI-powered fix suggestions for your resume.</p>
              </div>

              <div className="card-h rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
                <div className="mb-6 text-4xl">📊</div>
                <h3 className="mb-3 text-xl font-bold text-white">JD Match Analyzer</h3>
                <p className="text-zinc-400 leading-relaxed">Upload any job description and see exactly how well your resume matches it.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. HOW IT WORKS */}
        <section id="how-it-works" className="py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">HOW IT WORKS</span>
              <h2 className="mt-4 font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl">3 simple steps to interview success</h2>
            </div>
            
            <div className="grid gap-12 md:grid-cols-3 relative">
              {/* Optional connector line on desktop */}
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
              
              <div className="relative text-center md:text-left z-10">
                <span className="block font-['PT_Sans'] text-7xl font-bold text-accent/20 mb-4">01</span>
                <h3 className="text-xl font-bold text-white mb-3">Choose Your Company & Role</h3>
                <p className="text-zinc-400 leading-relaxed">Select from over 50 top Indian and global companies and pick the exact role you're applying for.</p>
              </div>
              
              <div className="relative text-center md:text-left z-10">
                <span className="block font-['PT_Sans'] text-7xl font-bold text-accent/20 mb-4">02</span>
                <h3 className="text-xl font-bold text-white mb-3">Practice with AI Interviewer</h3>
                <p className="text-zinc-400 leading-relaxed">Answer dynamic, adaptive questions based on real interview patterns via text or voice.</p>
              </div>
              
              <div className="relative text-center md:text-left z-10">
                <span className="block font-['PT_Sans'] text-7xl font-bold text-accent/20 mb-4">03</span>
                <h3 className="text-xl font-bold text-white mb-3">Get Instant Feedback & Improve</h3>
                <p className="text-zinc-400 leading-relaxed">Receive a detailed breakdown of your performance, model answers, and areas to improve before the real day.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. PRICING SECTION */}
        <section id="pricing" className="py-24 px-6 bg-zinc-900/40">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">PRICING</span>
              <h2 className="mt-4 font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl">Simple, transparent pricing</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              {/* Plan 1 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2">Basic</h3>
                <div className="mb-4"><span className="text-3xl font-bold text-white">Rs.99</span></div>
                <ul className="mb-8 space-y-3 flex-1">
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ 3 extra sessions</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ 3 extra resume fixes</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ Never expires</li>
                </ul>
                <Link href="/pricing" className="w-full rounded-xl border border-zinc-700 py-3 text-center font-bold text-white transition-colors hover:bg-zinc-800">Upgrade</Link>
              </div>
              
              {/* Plan 2 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2">Standard</h3>
                <div className="mb-4"><span className="text-3xl font-bold text-white">Rs.199</span></div>
                <ul className="mb-8 space-y-3 flex-1">
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ 8 extra sessions</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ 6 extra resume fixes</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ Never expires</li>
                </ul>
                <Link href="/pricing" className="w-full rounded-xl border border-zinc-700 py-3 text-center font-bold text-white transition-colors hover:bg-zinc-800">Upgrade</Link>
              </div>
              
              {/* Plan 3 */}
              <div className="rounded-2xl border border-[#FF6B2B] bg-zinc-900 p-6 flex flex-col relative shadow-[0_0_30px_rgba(255,107,43,0.1)]">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#FF6B2B] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">Most Popular</span>
                <h3 className="text-lg font-bold text-white mb-2">Interview Boost</h3>
                <div className="mb-4"><span className="text-3xl font-bold text-white">Rs.299</span></div>
                <ul className="mb-8 space-y-3 flex-1">
                  <li className="text-sm text-white font-medium flex items-center gap-2">✓ 7-day unlimited access [sessions and resume fixes]</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ No restrictions</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ Never Expires</li>
                </ul>
                <Link href="/pricing" className="w-full rounded-xl bg-[#FF6B2B] py-3 text-center font-bold text-black transition-colors hover:bg-[#ff8552]">Upgrade</Link>
              </div>

              {/* Plan 4 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2">Pro Plan</h3>
                <div className="mb-4"><span className="text-3xl font-bold text-white">Rs.599</span><span className="text-zinc-500 text-sm"> /month</span></div>
                <ul className="mb-8 space-y-3 flex-1">
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ Unlimited access for 30 days [Sessions and resume fixes]</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ No restrictions</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ Never Expires</li>
                </ul>
                <Link href="/pricing" className="w-full rounded-xl border border-zinc-700 py-3 text-center font-bold text-white transition-colors hover:bg-zinc-800">Upgrade</Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. TESTIMONIALS */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">REVIEWS</span>
              <h2 className="mt-4 font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl">What students say</h2>
            </div>
            
            {feedbacks.length === 0 ? (
              <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-12 text-center">
                <div className="mb-6 text-5xl">💬</div>
                <h3 className="mb-3 text-2xl font-bold text-white">Reviews coming soon</h3>
                <p className="mb-6 leading-relaxed text-zinc-400">
                  We just launched! Be among the first to try HackerCompliment and share your experience after your interview practice.
                </p>
                <p className="text-sm font-semibold text-accent">
                  Have feedback? Use the feedback button below →
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {feedbacks.map((f, i) => (
                  <div key={i} className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 flex flex-col relative shadow-lg">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold text-white text-lg">{f.name || "Anonymous Student"}</h3>
                      <div className="flex text-accent text-sm">
                        {"★".repeat(Math.abs(f.rating))}{"☆".repeat(5 - Math.abs(f.rating))}
                      </div>
                    </div>
                    <p className="flex-1 text-zinc-300 leading-relaxed">
                      "{f.message}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 8. CTA SECTION */}
        <section className="py-24 px-6 relative z-10">
          <div className="mx-auto max-w-5xl rounded-3xl bg-zinc-900 px-6 py-20 text-center relative overflow-hidden">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl mb-4">Ready to crack your dream company interview?</h2>
              <p className="mb-10 text-lg text-zinc-400">Join thousands of students who landed jobs at top companies.</p>
              <Link href="/signup" className="shimmer inline-flex items-center justify-center rounded-full bg-accent px-10 py-4 text-lg font-bold text-zinc-950">
                Start Free Today →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 9. FOOTER */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-12 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-1 text-xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <img src="/logo-colored.png" alt="Logo" className="h-7 w-auto sm:h-8 -mr-1" />
              <div className="flex">
                <span className="text-white">Hacker</span>
                <span className="text-accent">Compliment</span>
              </div>
            </Link>
            <p className="text-sm text-zinc-500 max-w-sm mt-4">Ace every interview with AI-powered practice, real company questions, and instant feedback...</p>
          </div>
          
          <div className="flex flex-wrap gap-6 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#history" className="hover:text-white transition-colors">History</a>
            <Link href="/resume" className="hover:text-white transition-colors">Resume</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
        
        <div className="mx-auto max-w-6xl border-t border-zinc-800/60 pt-8 text-center text-xs text-zinc-600">
          © 2026 HackerCompliment. All rights reserved.
        </div>
      </footer>
      </div>
    </div>
  );
}
