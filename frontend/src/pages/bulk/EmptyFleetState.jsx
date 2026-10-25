import { Link } from 'react-router-dom'
import {
  Globe,
  Download,
  Plus,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  Key,
  Server
} from 'lucide-react'

export default function EmptyFleetState({
  title = "No WordPress Websites Connected Yet",
  description = "Your fleet management dashboard is completely fresh. Connect your WordPress website by installing the MDefender-Pro plugin to start managing plugins, themes, automated backups, and deep malware scans.",
  featureName = "Fleet Operations"
}) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #D9E1DC',
      padding: '48px 32px',
      boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
      textAlign: 'center',
      marginTop: '12px',
      marginBottom: '32px'
    }}>
      {/* Icon Badge */}
      <div style={{
        width: '68px',
        height: '68px',
        borderRadius: '20px',
        background: '#FAFBF9',
        border: '1.5px solid #D9E1DC',
        color: '#2A8B68',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(11, 37, 34, 0.05)'
      }}>
        <Globe size={34} strokeWidth={1.8} />
      </div>

      {/* Heading */}
      <h3 style={{
        fontSize: '22px',
        fontWeight: '800',
        color: '#10201E',
        margin: '0 0 10px',
        letterSpacing: '-0.02em'
      }}>
        {title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: '14px',
        color: '#60716B',
        maxWidth: '620px',
        margin: '0 auto 28px',
        lineHeight: '1.6'
      }}>
        {description}
      </p>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '40px'
      }}>
        <Link
          to="/user/websites"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '10px',
            background: '#10201E',
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '13.5px',
            textDecoration: 'none',
            boxShadow: '0 2px 10px rgba(16, 32, 30, 0.2)',
            transition: 'all 0.15s ease'
          }}
        >
          <Plus size={16} />
          <span>Connect Your First WordPress Site</span>
        </Link>

        <a
          href="/downloads/mdefender-pro.zip"
          download="mdefender-pro.zip"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 22px',
            borderRadius: '10px',
            background: '#FAFBF9',
            border: '1px solid #D9E1DC',
            color: '#10201E',
            fontWeight: '700',
            fontSize: '13.5px',
            textDecoration: 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Download size={16} color="#2A8B68" />
          <span>Download Plugin (.zip)</span>
        </a>
      </div>

      {/* 3 Step Setup Guide */}
      <div style={{
        borderTop: '1px solid #EEF2F0',
        paddingTop: '36px',
        maxWidth: '860px',
        margin: '0 auto'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#87948D',
          marginBottom: '20px'
        }}>
          How to connect your WordPress site in 3 simple steps
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
          textAlign: 'left'
        }}>
          <div style={{
            background: '#FAFBF9',
            border: '1px solid #D9E1DC',
            borderRadius: '12px',
            padding: '18px 20px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#0B2522',
              color: '#2A8B68',
              fontSize: '12px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              1
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#10201E', marginBottom: '4px' }}>
              Add Your Domain
            </div>
            <div style={{ fontSize: '12.5px', color: '#60716B', lineHeight: '1.45' }}>
              Go to <Link to="/user/websites" style={{ color: '#2A8B68', fontWeight: '700', textDecoration: 'none' }}>Websites</Link> and enter your WordPress domain to generate your dedicated API key.
            </div>
          </div>

          <div style={{
            background: '#FAFBF9',
            border: '1px solid #D9E1DC',
            borderRadius: '12px',
            padding: '18px 20px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#0B2522',
              color: '#2A8B68',
              fontSize: '12px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              2
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#10201E', marginBottom: '4px' }}>
              Install Plugin
            </div>
            <div style={{ fontSize: '12.5px', color: '#60716B', lineHeight: '1.45' }}>
              Upload <code>mdefender-pro.zip</code> into your WordPress Admin (<code>Plugins &gt; Add New &gt; Upload</code>) and activate.
            </div>
          </div>

          <div style={{
            background: '#FAFBF9',
            border: '1px solid #D9E1DC',
            borderRadius: '12px',
            padding: '18px 20px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#0B2522',
              color: '#2A8B68',
              fontSize: '12px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              3
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#10201E', marginBottom: '4px' }}>
              Activate {featureName}
            </div>
            <div style={{ fontSize: '12.5px', color: '#60716B', lineHeight: '1.45' }}>
              Paste your Site API Key into the plugin settings. Real-time telemetry, plugins, themes, and health metrics will appear here automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
