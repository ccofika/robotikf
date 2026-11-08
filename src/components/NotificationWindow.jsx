import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, TriangleAlert, Car, Users, Star, Bell, X, CheckCheck } from 'lucide-react'
import { cx, Btn, Led } from '../security/sx/ui'
import { Tabs } from '../security/sx/layout'
import { Checkbox } from '../security/sx/forms'
import { useLayer } from '../security/sx/layer'
import { EASE_OUT } from '../security/sx/motion'

// Panel obaveštenja Montaže u izgledu Security dela (iskačući panel uz šinu, na telefonu ispod gornje trake).
// Logika (učitavanje, označavanje, navigacija po tipu) je ista kao ranije.

// API functions
const fetchNotifications = async () => {
  try {
    const apiUrl = process.env.REACT_APP_API_URL || '';
    const response = await fetch(`${apiUrl}/api/notifications`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch notifications')
    }
    
    const data = await response.json()
    return data.notifications || []
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

const markAsRead = async (notificationId) => {
  try {
    const apiUrl = process.env.REACT_APP_API_URL || '';
    const response = await fetch(`${apiUrl}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to mark notification as read')
    }
    
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

const markAllAsRead = async () => {
  try {
    const apiUrl = process.env.REACT_APP_API_URL || '';
    const response = await fetch(`${apiUrl}/api/notifications/mark-all-read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read')
    }
    
    return true
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }
}

const markSelectedAsRead = async (notificationIds) => {
  try {
    const apiUrl = process.env.REACT_APP_API_URL || '';
    const response = await fetch(`${apiUrl}/api/notifications/mark-selected-read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notificationIds: Array.from(notificationIds) })
    })
    
    if (!response.ok) {
      throw new Error('Failed to mark selected notifications as read')
    }
    
    return true
  } catch (error) {
    console.error('Error marking selected notifications as read:', error)
    return false
  }
}

const NotificationWindow = ({ isOpen, onClose, onNotificationUpdate, mobile, left = 260 }) => {
  const [activeTab, setActiveTab] = useState('nove')
  const [selectedNotifications, setSelectedNotifications] = useState(new Set())
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Load notifications when window opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const notificationData = await fetchNotifications()
      const transformedNotifications = notificationData.map(transformNotification)
      setNotifications(transformedNotifications)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      // Fallback to empty array
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  // Transform API notification to display format
  const transformNotification = (apiNotification) => {
    const getNotificationIcon = (type) => {
      switch (type) {
        case 'work_order_verification': return <ClipboardList size={18} strokeWidth={1.8} />
        case 'material_anomaly': return <TriangleAlert size={18} strokeWidth={1.8} />
        case 'vehicle_registration_expiry': return <Car size={18} strokeWidth={1.8} />
        case 'technician_employment_expiry': return <Users size={18} strokeWidth={1.8} />
        case 'low_review_rating': return <Star size={18} strokeWidth={1.8} />
        case 'duplicate_address': return <TriangleAlert size={18} strokeWidth={1.8} />
        default: return <Bell size={18} strokeWidth={1.8} />
      }
    }

    const getNotificationContent = (notification) => {
      switch (notification.type) {
        case 'work_order_verification':
          return {
            action: 'je završio radni nalog u sistemu',
            target: notification.workOrder?.jobId || 'Radni nalog',
            content: `Tehničar je označio radni nalog kao završen i čeka verifikaciju od strane administratora.`
          }
        case 'material_anomaly':
          return {
            action: 'je prijavio anomaliju materijala',
            target: notification.material?.name || 'Material',
            content: `Prijavljene su anomalije tipa: ${notification.material?.anomalyType || 'nespecifikovano'}`
          }
        case 'vehicle_registration_expiry':
          return {
            action: 'vozilo sa registracijom koja ističe',
            target: `${notification.vehicle?.name} (${notification.vehicle?.licensePlate})`,
            content: `Registracija vozila ističe uskoro. Potrebno je obnoviti registraciju.`
          }
        case 'technician_employment_expiry':
          return {
            action: 'ugovor tehničara ističe',
            target: notification.technician?.name || 'Tehničar',
            content: `Ugovor o zaposlenju ističe uskoro. Potrebno je obnoviti ugovor.`
          }
        case 'low_review_rating':
          return {
            action: 'loša ocena korisnika',
            target: notification.technicianName || 'Tehničar',
            content: notification.message || `Korisnik je dao nisku ocenu tehničaru.`
          }
        case 'duplicate_address':
          return {
            action: 'nalog na adresi otkazanog naloga',
            target: null,
            content: notification.message
          }
        default:
          return {
            action: 'je poslao notifikaciju',
            target: null,
            content: notification.message
          }
      }
    }

    const content = getNotificationContent(apiNotification)
    
    return {
      id: apiNotification.id,
      type: apiNotification.type,
      user: {
        name: apiNotification.user?.name || 'Sistem',
        avatar: null,
        fallback: apiNotification.user?.fallback || 'S',
      },
      action: content.action,
      target: content.target,
      content: content.content,
      timestamp: apiNotification.formattedTimestamp || new Date(apiNotification.createdAt).toLocaleDateString('sr-RS'),
      timeAgo: apiNotification.timeAgo || 'sada',
      isRead: apiNotification.isRead,
      priority: apiNotification.priority || 'normal',
      hasActions: false, // TODO: implement actions based on notification type
      icon: getNotificationIcon(apiNotification.type),
      // Navigation data
      targetPage: apiNotification.targetPage,
      targetTab: apiNotification.targetTab,
      targetId: apiNotification.targetId,
      // Work order data for navigation
      workOrder: apiNotification.workOrder,
      // Technician data
      technician: apiNotification.technician
    }
  }

  // Razdvajanje: radni nalozi idu ISKLJUČIVO u svoj tab, ostale notifikacije u Nove/Pročitane
  const nonWorkOrderNotifications = notifications.filter(n => n.type !== 'work_order_verification')
  const workOrderNotifications = notifications.filter(n => n.type === 'work_order_verification')

  const unreadNonWO = nonWorkOrderNotifications.filter(n => !n.isRead)
  const readNonWO = nonWorkOrderNotifications.filter(n => n.isRead)

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "nove":
        return unreadNonWO
      case "procitane":
        return readNonWO
      case "work-orders":
        return workOrderNotifications
      default:
        return notifications
    }
  }

  const filteredNotifications = getFilteredNotifications()

  const handleNotificationClick = async (notificationId) => {
    const success = await markAsRead(notificationId)
    if (success) {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ))
      // Update sidebar badge count
      if (onNotificationUpdate) {
        onNotificationUpdate()
      }
    }
  }

  const handleSelectNotification = (notificationId, checked) => {
    const newSelected = new Set(selectedNotifications)
    if (checked) {
      newSelected.add(notificationId)
    } else {
      newSelected.delete(notificationId)
    }
    setSelectedNotifications(newSelected)
  }

  const handleMarkAllAsRead = async () => {
    // Za "Nove" tab - označi samo ne-radni-nalog notifikacije kao pročitane
    // Za "Radni nalozi" tab - označi sve radne naloge kao pročitane
    const idsToMark = filteredNotifications.filter(n => !n.isRead).map(n => n.id)
    if (idsToMark.length === 0) return

    const success = await markSelectedAsRead(idsToMark)
    if (success) {
      setNotifications(prev => prev.map(n =>
        idsToMark.includes(n.id) ? { ...n, isRead: true } : n
      ))
      setSelectedNotifications(new Set())
      if (onNotificationUpdate) {
        onNotificationUpdate()
      }
    }
  }

  const handleMarkSelectedAsRead = async () => {
    const success = await markSelectedAsRead(selectedNotifications)
    if (success) {
      setNotifications(prev => prev.map(n => 
        selectedNotifications.has(n.id) ? { ...n, isRead: true } : n
      ))
      setSelectedNotifications(new Set())
      // Update sidebar badge count
      if (onNotificationUpdate) {
        onNotificationUpdate()
      }
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)))
    } else {
      setSelectedNotifications(new Set())
    }
  }

  useEffect(() => {
    setSelectedNotifications(new Set())
  }, [activeTab])

  // Navigation function to handle different notification types
  const handleNavigateToNotification = (notification) => {
    // Mark as read first
    handleNotificationClick(notification.id)
    
    // Close notification window
    onClose()

    // Navigate based on notification type and target data
    switch (notification.type) {
      case 'work_order_verification':
        // Navigate to WorkOrdersByTechnician page with verification tab and tisJobId search
        if (notification.workOrder && notification.workOrder.tisJobId) {
          navigate(`/work-orders?tab=verification&search=${notification.workOrder.tisJobId}`)
        } else {
          // Fallback to verification tab without search
          navigate('/work-orders?tab=verification')
        }
        break
      
      case 'material_anomaly':
        // Navigate to logs page with technicians tab (material validation is part of technicians tab)
        navigate('/logs?tab=technicians', { 
          state: { 
            showMaterialValidation: true,
            logId: notification.targetId 
          } 
        })
        break
      
      case 'vehicle_registration_expiry':
        if (notification.targetId) {
          navigate('/vehicles', { state: { highlightVehicle: notification.targetId } })
        } else {
          navigate('/vehicles', { state: { filter: 'expiring' } })
        }
        break

      case 'technician_employment_expiry':
        if (notification.targetId) {
          navigate(`/technicians/${notification.targetId}`)
        } else {
          navigate('/technicians')
        }
        break

      case 'low_review_rating':
        if (notification.targetId) {
          navigate(`/technicians/${notification.targetId}`, { state: { tab: 'reviews' } })
        } else {
          navigate('/technicians')
        }
        break

      case 'duplicate_address':
        // Pojedinačna vodi na detalje flagovanog naloga; zbirna na listu naloga
        if (notification.targetPage && notification.targetPage.startsWith('/work-orders/')) {
          navigate(notification.targetPage)
        } else if (notification.targetId) {
          navigate(`/work-orders/${notification.targetId}`)
        } else {
          navigate('/work-orders')
        }
        break

      default:
        // Security obaveštenja vode na svoju stranicu, ostalo na dashboard
        if (notification.targetPage && notification.targetPage.startsWith('/security')) navigate(notification.targetPage)
        else navigate('/')
        break
    }

    // Scroll to target element if targetId is provided
    if (notification.targetId) {
      setTimeout(() => {
        const element = document.getElementById(`notification-target-${notification.targetId}`)
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          
          // Add highlight effect
          element.classList.add('notification-highlight')
          setTimeout(() => {
            element.classList.remove('notification-highlight')
          }, 3000)
        }
      }, 500) // Wait for navigation to complete
    }
  }

  const panelRef = useRef(null)
  useLayer(isOpen, onClose)
  useEffect(() => {
    if (!isOpen) return undefined
    const on = (e) => { if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('[data-testid="bell"]')) onClose() }
    document.addEventListener('mousedown', on)
    return () => document.removeEventListener('mousedown', on)
  }, [isOpen, onClose])

  const TONE = { work_order_verification: 'info', material_anomaly: 'warn', vehicle_registration_expiry: 'bad', technician_employment_expiry: 'warn', low_review_rating: 'warn', duplicate_address: 'warn' }
  const allSelected = filteredNotifications.length > 0 && selectedNotifications.size === filteredNotifications.length
  const emptyText = activeTab === 'nove' ? 'Nema novih notifikacija' : activeTab === 'procitane' ? 'Nema pročitanih notifikacija' : 'Nema notifikacija u ovoj kategoriji'

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="sx-portal">
          <motion.div ref={panelRef} className={cx('sx-pop sx-notifs mx-notifs', mobile && 'is-mobile')} style={mobile ? undefined : { left }} role="dialog" aria-label="Vaše notifikacije" data-testid="notifications"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6, transition: { duration: 0.12, ease: 'linear' } }}
            transition={{ opacity: { duration: 0.15, ease: 'linear' }, y: { duration: 0.28, ease: EASE_OUT } }}>
            <div className="sx-notifs__head">
              <span className="sx-eyebrow">Vaše notifikacije</span>
              <div className="mx-notifs__acts">
                {selectedNotifications.size > 0 && <Btn size="sm" onClick={handleMarkSelectedAsRead}>Označi ({selectedNotifications.size})</Btn>}
                {(activeTab === 'nove' || activeTab === 'work-orders') && filteredNotifications.some(n => !n.isRead) && (
                  <Btn size="sm" variant="ghost" icon={CheckCheck} onClick={handleMarkAllAsRead} title="Označi sve kao pročitano" aria-label="Označi sve kao pročitano" />
                )}
                <button type="button" className="sx-dialog__close" onClick={onClose} aria-label="Zatvori"><X size={18} strokeWidth={1.8} /></button>
              </div>
            </div>
            <div className="mx-notifs__tabs">
              <Tabs ariaLabel="Vrsta notifikacija" layoutId="mx-notifs-tab" value={activeTab} onChange={setActiveTab} items={[
                { key: 'nove', label: 'Nove', count: unreadNonWO.length, tone: unreadNonWO.length ? 'bad' : undefined },
                { key: 'procitane', label: 'Pročitane', count: readNonWO.length },
                { key: 'work-orders', label: 'Radni nalozi', count: workOrderNotifications.length }
              ]} />
            </div>
            {filteredNotifications.length > 0 && (
              <div className="mx-notifs__select">
                <Checkbox checked={allSelected} onChange={handleSelectAll}>Izaberi sve ({filteredNotifications.length})</Checkbox>
              </div>
            )}
            <div className="sx-notifs__list">
              {loading ? (
                <div className="sx-empty"><b>Učitavanje...</b></div>
              ) : filteredNotifications.length === 0 ? (
                <div className="sx-empty"><b>{emptyText}</b></div>
              ) : filteredNotifications.map((n) => (
                <div key={n.id} role="button" tabIndex={0} className={cx('sx-notif mx-notif', !n.isRead && 'is-new')} onClick={() => handleNavigateToNotification(n)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNavigateToNotification(n) }}>
                  <span className="mx-notif__check" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedNotifications.has(n.id)} onChange={(v) => handleSelectNotification(n.id, v)} />
                  </span>
                  <span className={cx('sx-item__icon', TONE[n.type] === 'bad' && 'is-bad', TONE[n.type] === 'warn' && 'is-warn')}>{n.icon}</span>
                  <span className="sx-notif__body">
                    <b>{n.user.name} <span className="mx-notif__action">{n.action}</span>{n.target && <> <span className="mx-notif__target">{n.target}</span></>}</b>
                    {n.content && <span>{n.content}</span>}
                    <span className="mx-notif__meta">{n.timestamp}</span>
                  </span>
                  <span className="mx-notif__side">
                    <time className="sx-notif__time">{n.timeAgo}</time>
                    {!n.isRead && <Led tone="info" />}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default NotificationWindow
