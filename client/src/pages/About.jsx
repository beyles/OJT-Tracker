import Layout from '../components/Layout'

export default function About() {
  return (
    <Layout title="About">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 40px' }}>
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
          padding: '48px 40px', maxWidth: '600px', width: '100%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            <img src="/sparkplug-logo.png" alt="Sparkplug" style={{ width: '300px', maxWidth: '100%' }} />
          </div>

          {/* Name + subtitle */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#111827', letterSpacing: '0.04em', marginBottom: '10px' }}>
              SPARKPLUG
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
              Shopfloor Personnel Advancement, Records & Knowledge Platform — Learning Upskilling Gateway
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '28px' }} />

          {/* Info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
            {[
              { label: 'Version',  value: '1.0.0' },
              { label: 'Last Updated', value: 'June 12, 2026' },
              { label: 'Platform', value: 'Manufacturing Training & Compliance' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>{label}</span>
                <span style={{ fontSize: '13px', color: '#111827', fontWeight: '500' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '24px' }} />

          {/* Description */}
          <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.75, margin: '0 0 32px' }}>
            Sparkplug is a comprehensive shopfloor training management platform designed to track operator
            certifications, on-the-job training progress, MPI document acknowledgments, and daily staffing
            compliance. Built to ensure every operator on the floor is qualified, trained, and compliant.
          </p>

          {/* Accent strip */}
          <div style={{ background: '#e6faf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '32px' }}>
            <div style={{ fontSize: '12px', color: '#00c896', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Built for manufacturing floors
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
            © 2026 Sparkplug. All rights reserved.
          </div>

        </div>
      </div>
    </Layout>
  )
}
