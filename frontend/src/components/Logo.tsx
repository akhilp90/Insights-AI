const Logo = ({ size = 28 }: { size?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <svg width={size} height={size} viewBox='0 0 28 28' fill='none'>
      <rect width='28' height='28' rx='6' fill='#185FA5'/>
      <polyline points='5,20 10,13 15,16 22,7' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
      <circle cx='22' cy='7' r='2' fill='#60A5D4'/>
      <circle cx='15' cy='16' r='1.5' fill='#fff' opacity='0.7'/>
    </svg>
    <span style={{ fontSize: size * 0.55, fontWeight: 500, color: '#1a1a1a' }}>Insights</span>
  </div>
);

export default Logo;
