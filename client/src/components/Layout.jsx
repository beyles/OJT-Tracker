import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout({ title, subtitle, children }) {
  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#f9fafb'
    }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar title={title} subtitle={subtitle} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}