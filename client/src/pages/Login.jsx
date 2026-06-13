import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        username,
        password
      })
      login(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      margin: 0,
      padding: 0
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '36px',
        width: '360px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'center' }}>
          <img src="/sparkplug-logo.png" alt="Sparkplug" style={{ maxWidth: '280px', width: '100%' }} />
        </div>

        <div style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>Sign in</div>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '28px' }}>Enter your credentials</div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '7px' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              required
              style={{
                width: '100%', padding: '10px 14px',
                background: '#f9fafb', border: '1px solid #d1d5db',
                borderRadius: '6px', color: '#111827', fontSize: '13px',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '7px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '10px 14px',
                background: '#f9fafb', border: '1px solid #d1d5db',
                borderRadius: '6px', color: '#111827', fontSize: '13px',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '6px', padding: '10px 14px',
              color: '#dc2626', fontSize: '13px', marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px',
              background: loading ? '#00a578' : '#00c896',
              border: 'none', borderRadius: '6px',
              color: '#ffffff', fontWeight: '600', fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}