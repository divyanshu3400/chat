'use client'
import { memo } from 'react'
import {
  MessageCircle,
  Users,
  PenSquare,
  Bookmark,
  Settings2,
} from 'lucide-react'
import { SbTab } from '@/src/store/store'

export type Tab = 'all' | 'groups' | 'starred' | 'dms' | 'unread'

interface BottomNavProps {
  tab: Tab
  onTab: (t: SbTab) => void
  unread: number
  onNewChat: () => void
  onSettings: () => void
}

interface NavItem {
  key: string
  icon: React.ReactNode
  label: string
  badge?: number
  action?: () => void
  isTab?: SbTab
  isCenter?: boolean
}

export const BottomNav = memo(({ tab, onTab, unread, onNewChat, onSettings }: BottomNavProps) => {
  const navItems: NavItem[] = [
    {
      key: 'all',
      icon: <MessageCircle size={20} strokeWidth={1.8} />,
      label: 'Chats',
      badge: unread,
      isTab: 'all',
    },
    {
      key: 'groups',
      icon: <Users size={20} strokeWidth={1.8} />,
      label: 'Groups',
      isTab: 'groups',
    },
    {
      key: 'compose',
      icon: <PenSquare size={22} strokeWidth={2} />,
      label: 'New',
      action: onNewChat,
      isCenter: true,
    },
    {
      key: 'starred',
      icon: <Bookmark size={20} strokeWidth={1.8} />,
      label: 'Saved',
      isTab: 'starred',
    },
    {
      key: 'settings',
      icon: <Settings2 size={20} strokeWidth={1.8} />,
      label: 'Settings',
      action: onSettings,
    },
  ]

  return (
    <>
      <style>{`
        .bnav {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-around;
          height: 62px;
          background: var(--bg);
          border-top: 1px solid var(--border);
          padding: 0 4px;
          z-index: 10;
          flex-shrink: 0;
        }

        /* Frosted glass variant — add .bnav-glass to parent if desired */
        .bnav-glass {
          background: color-mix(in srgb, var(--bg) 85%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .bnav-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 3px;
          height: 100%;
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
          color: var(--tx3);
          transition: color .18s;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          min-width: 0;
        }

        .bnav-item:active {
          transform: scale(.92);
          transition: transform .1s, color .18s;
        }

        .bnav-item.active {
          color: var(--ac);
        }

        .bnav-item.active .bnav-pill {
          opacity: 1;
          transform: scaleX(1);
        }

        .bnav-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 28px;
          border-radius: 14px;
          transition: background .18s;
        }

        .bnav-item.active .bnav-icon-wrap {
          background: var(--ac-tint, rgba(99,102,241,.12));
        }

        .bnav-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: .2px;
          line-height: 1;
          transition: font-weight .18s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 56px;
        }

        .bnav-item.active .bnav-label {
          font-weight: 700;
        }

        .bnav-badge {
          position: absolute;
          top: -3px;
          right: -4px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 8px;
          background: var(--ac);
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          box-shadow: 0 0 0 2px var(--bg);
          letter-spacing: 0;
        }

        /* ── Center FAB button ── */
        .bnav-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }

        .bnav-center:active .bnav-fab {
          transform: scale(.9) rotate(15deg);
        }

        .bnav-fab {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: var(--ac);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 14px color-mix(in srgb, var(--ac) 45%, transparent);
          transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s;
        }

        .bnav-center:hover .bnav-fab {
          box-shadow: 0 6px 20px color-mix(in srgb, var(--ac) 55%, transparent);
          transform: translateY(-1px);
        }
      `}</style>

      <nav className="bnav">
        {navItems.map(item => {
          if (item.isCenter) {
            return (
              <button
                key={item.key}
                onClick={item.action}
                className="bnav-center"
                aria-label={item.label}
              >
                <div className="bnav-fab">
                  {item.icon}
                </div>
              </button>
            )
          }

          const isActive = item.isTab ? tab === item.isTab : false
          const handleTap = item.isTab
            ? () => onTab(item.isTab as SbTab)
            : item.action ?? (() => { })

          return (
            <button
              key={item.key}
              onClick={handleTap}
              className={`bnav-item${isActive ? ' active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="bnav-icon-wrap">
                {item.icon}
                {(item.badge ?? 0) > 0 && (
                  <span className="bnav-badge">
                    {(item.badge ?? 0) > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="bnav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
})

BottomNav.displayName = 'BottomNav'
export default BottomNav