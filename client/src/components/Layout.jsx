import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import useBreakpoint from '../hooks/useBreakpoint'

export default function Layout({ title, subtitle, children }) {
  const { isMobileOrTablet } = useBreakpoint()

  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#f9fafb',
    }}>
      {!isMobileOrTablet && <Sidebar />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar title={title} subtitle={subtitle} />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: isMobileOrTablet ? '12px 10px' : '20px',
          paddingBottom: isMobileOrTablet ? '72px' : '20px',
        }}>
          {children}
        </div>
      </div>
      {isMobileOrTablet && <BottomNav />}
    </div>
  )
}
