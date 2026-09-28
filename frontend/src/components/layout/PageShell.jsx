import { motion } from 'framer-motion';

export default function PageShell({ title, subtitle, icon: Icon, children, badge, actions }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: 'easeOut' }} className="page-shell">
    <header className="page-heading">
      <div className="page-heading-copy">
        {Icon && <span className="page-heading-icon"><Icon size={19} /></span>}
        <div><div className="page-title-line"><h1>{title}</h1>{badge && <span className="page-badge">{badge}</span>}</div>{subtitle && <p>{subtitle}</p>}</div>
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </header>
    <div className="page-content">{children}</div>
  </motion.div>;
}
