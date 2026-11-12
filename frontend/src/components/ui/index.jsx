import React from 'react';
import './ui.css';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = '',
  ...rest
}) {
  const classes = ['mdui-btn', `mdui-btn-${variant}`, size !== 'md' ? `mdui-btn-${size}` : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={classes} {...rest}>
      {Icon ? <Icon size={size === 'sm' ? 14 : 15} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

export function Card({ title, subtitle, action, children, flush = false, className = '', bodyClassName = '' }) {
  return (
    <section className={`mdui-card ${className}`}>
      {(title || action) && (
        <div className="mdui-card-head">
          <div className="mdui-card-head-text">
            {title && <h2 className="mdui-card-title">{title}</h2>}
            {subtitle && <p className="mdui-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="mdui-page-actions">{action}</div>}
        </div>
      )}
      <div className={`${flush ? 'mdui-card-body-flush' : 'mdui-card-body'} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Badge({ tone = 'neutral', dot = false, children, className = '' }) {
  return (
    <span className={`mdui-badge mdui-badge-${tone} ${className}`}>
      {dot ? <i className="mdui-dot" /> : null}
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mdui-page-header">
      <div>
        {eyebrow && <p className="mdui-page-eyebrow">{eyebrow}</p>}
        <h1 className="mdui-page-title">{title}</h1>
        {description && <p className="mdui-page-desc">{description}</p>}
      </div>
      {actions && <div className="mdui-page-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, trend, trendDir = 'neutral' }) {
  return (
    <div className="mdui-stat">
      <div className="mdui-stat-top">
        <span className="mdui-stat-label">{label}</span>
        {Icon ? (
          <span className="mdui-stat-icon">
            <Icon size={15} strokeWidth={1.9} />
          </span>
        ) : null}
      </div>
      <div className="mdui-stat-value">{value}</div>
      {hint && <div className="mdui-stat-hint">{hint}</div>}
      {trend && <div className={`mdui-stat-trend ${trendDir}`}>{trend}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="mdui-empty">
      {Icon ? (
        <span className="mdui-empty-icon">
          <Icon size={18} strokeWidth={1.8} />
        </span>
      ) : null}
      <div className="mdui-empty-title">{title}</div>
      {description && <p className="mdui-empty-desc">{description}</p>}
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius = 6 }) {
  return <div className="mdui-skel" style={{ height, width, borderRadius: radius }} />;
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="mdui-segmented" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Dotline({ tone = 'ok', children }) {
  return (
    <span className="mdui-dotline">
      <i className={tone} />
      {children}
    </span>
  );
}
