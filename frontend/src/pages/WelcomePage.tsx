import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export const WelcomePage = () => {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [imagePositions, setImagePositions] = useState([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ])
  const [floatOffsets, setFloatOffsets] = useState([0, 0, 0, 0, 0, 0])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const floatTimeRef = useRef(0)
  const targetPositionsRef = useRef([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const deltaX = (e.clientX - centerX) / rect.width
      const deltaY = (e.clientY - centerY) / rect.height
      
      targetPositionsRef.current = [
        { x: deltaX * 50, y: deltaY * 50 },
        { x: deltaX * 35, y: deltaY * 35 },
        { x: deltaX * 25, y: deltaY * 25 },
        { x: deltaX * 40, y: deltaY * 40 },
        { x: deltaX * 30, y: deltaY * 30 },
        { x: deltaX * 28, y: deltaY * 28 },
      ]
    }

    const animate = () => {
      floatTimeRef.current += 0.008
      
      setImagePositions(prev => {
        const newPositions = prev.map((pos, i) => {
          const targetX = targetPositionsRef.current[i].x
          const targetY = targetPositionsRef.current[i].y
          
          return {
            x: pos.x + (targetX - pos.x) * 0.08,
            y: pos.y + (targetY - pos.y) * 0.08,
          }
        })
        return newPositions
      })

      setFloatOffsets(prev => 
        prev.map((_, i) => Math.sin(floatTimeRef.current + i * 0.7) * 12)
      )
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const handleContinue = () => {
    navigate('/projects')
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full h-screen max-h-screen bg-gradient-to-br from-[#050017] via-[#0a001a] to-[#050017] text-white flex flex-col items-center justify-center gap-8 px-8 py-12 relative overflow-hidden"
    >
      {/* Floating Background Box 1 - Top Left */}
      <div 
        className="absolute pointer-events-none z-0"
        style={{
          left: '5%',
          top: '10%',
          width: '360px',
          height: '320px',
          transform: `translate(${imagePositions[0].x}px, calc(${imagePositions[0].y}px + ${floatOffsets[0]}px))`,
          transition: 'none',
        }}
      >
        <div className="w-full h-full rounded-3xl bg-violet-950/35 backdrop-blur-sm pointer-events-none" />
      </div>

      {/* Floating Background Box 2 - Top Right */}
      <div 
        className="absolute pointer-events-none z-0"
        style={{
          right: '5%',
          top: '8%',
          width: '340px',
          height: '300px',
          transform: `translate(${imagePositions[1].x}px, calc(${imagePositions[1].y}px + ${floatOffsets[1]}px))`,
          transition: 'none',
        }}
      >
        <div className="w-full h-full rounded-3xl bg-purple-950/30 backdrop-blur-sm pointer-events-none" />
      </div>

      {/* Floating Background Box 3 - Bottom Left */}
      <div 
        className="absolute pointer-events-none z-0"
        style={{
          left: '8%',
          bottom: '10%',
          width: '380px',
          height: '340px',
          transform: `translate(${imagePositions[2].x}px, calc(${imagePositions[2].y}px + ${floatOffsets[2]}px))`,
          transition: 'none',
        }}
      >
        <div className="w-full h-full rounded-3xl bg-violet-950/30 backdrop-blur-sm pointer-events-none" />
      </div>

      {/* Floating Background Box 4 - Bottom Right */}
      <div 
        className="absolute pointer-events-none z-0"
        style={{
          right: '4%',
          bottom: '15%',
          width: '340px',
          height: '300px',
          transform: `translate(${imagePositions[3].x}px, calc(${imagePositions[3].y}px + ${floatOffsets[3]}px))`,
          transition: 'none',
        }}
      >
        <div className="w-full h-full rounded-3xl bg-purple-900/35 backdrop-blur-sm pointer-events-none" />
      </div>

      {/* Floating Background Box 5 - Left Center */}
      <div 
        className="absolute pointer-events-none z-0"
        style={{
          left: '2%',
          top: '50%',
          width: '300px',
          height: '280px',
          transform: `translateY(-50%) translate(${imagePositions[4].x}px, calc(${imagePositions[4].y}px + ${floatOffsets[4]}px))`,
          transition: 'none',
        }}
      >
        <div className="w-full h-full rounded-3xl bg-violet-900/30 backdrop-blur-sm pointer-events-none" />
      </div>

      {/* Floating Background Box 6 - Right Center */}
      <div 
        className="absolute pointer-events-none z-0"
        style={{
          right: '3%',
          top: '45%',
          width: '320px',
          height: '300px',
          transform: `translateY(-50%) translate(${imagePositions[5].x}px, calc(${imagePositions[5].y}px + ${floatOffsets[5]}px))`,
          transition: 'none',
        }}
      >
        <div className="w-full h-full rounded-3xl bg-purple-950/35 backdrop-blur-sm pointer-events-none" />
      </div>

      <div className="w-full max-w-2xl rounded-2xl bg-[rgba(0,0,0,0.55)] backdrop-blur-2xl border border-white/[0.06] px-12 py-16 flex flex-col items-center text-center gap-6 relative z-10" style={{
        animation: 'pageLoad 0.6s ease-out'
      }}>
        <h1 className="text-4xl font-semibold" style={{
          animation: 'fadeInUp 0.5s ease-out 0.1s both'
        }}>Welcome</h1>
        <p className="text-muted text-lg" style={{
          animation: 'fadeInUp 0.5s ease-out 0.2s both'
        }}>
          Set up and manage your projects
        </p>
        <button
          onClick={handleContinue}
          className="mt-4 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 ease-out hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] active:scale-95" style={{
            animation: 'fadeInUp 0.5s ease-out 0.3s both'
          }}
        >
          Continue
        </button>
      </div>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pageLoad {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}