import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader } from './ui/card'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { Checkbox } from './ui/checkbox'
import { 
  CheckIcon, 
  CloseIcon, 
  CheckCircleIcon,
  ClockIcon,
  AlertIcon,
  UserIcon,
  ToolsIcon,
  BoxIcon,
  ClipboardIcon,
  CarIcon,
  BellIcon
} from './icons/SvgIcons'

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

const NotificationWindow = ({ isOpen, onClose, position = { bottom: 20, left: 256 }, onNotificationUpdate }) => {
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
        case 'work_order_verification': return <ClipboardIcon size={20} />
        case 'material_anomaly': return <BoxIcon size={20} />
        case 'vehicle_registration_expiry': return <CarIcon size={20} />
        default: return <BellIcon size={20} />
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
      workOrder: apiNotification.workOrder
    }
  }

  const unreadNotifications = notifications.filter(n => !n.isRead)
  const readNotifications = notifications.filter(n => n.isRead)

  // Filter counts for tabs
  const workOrderCount = notifications.filter(n => n.type === 'work_order_verification').length
  const vehicleCount = notifications.filter(n => n.type === 'vehicle_registration_expiry').length

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "work-orders":
        return notifications.filter(n => n.type === "work_order_verification")
      case "vehicles":
        return notifications.filter(n => n.type === "vehicle_registration_expiry")
      case "procitane":
        return readNotifications
      case "nove":
        return unreadNotifications
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
    const success = await markAllAsRead()
    if (success) {
      if (activeTab === 'nove') {
        setNotifications(prev => prev.map(n => 
          !n.isRead ? { ...n, isRead: true } : n
        ))
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      }
      setSelectedNotifications(new Set())
      // Update sidebar badge count
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
          // Navigate to vehicles page with specific vehicle highlighted
          navigate('/vehicles', { state: { highlightVehicle: notification.targetId } })
        } else {
          // Navigate to vehicles page with expiring filter
          navigate('/vehicles', { state: { filter: 'expiring' } })
        }
        break
      
      default:
        // For unknown notification types, navigate to dashboard
        navigate('/')
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

  if (!isOpen) return null

  // Create specialized notification cards based on type
  const NotificationCard = ({ notification }) => {
    const handleNavigate = () => {
      handleNavigateToNotification(notification)
    }

    const renderNotificationIcon = () => {
      const iconClass = "size-10 p-2 rounded-lg flex items-center justify-center"
      
      switch (notification.type) {
        case 'work_order_verification':
          return (
            <div className={`${iconClass} bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400`}>
              <ClipboardIcon size={20} />
            </div>
          )
        case 'material_anomaly':
          return (
            <div className={`${iconClass} bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400`}>
              <AlertIcon size={20} />
            </div>
          )
        case 'vehicle_registration_expiry':
          return (
            <div className={`${iconClass} bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400`}>
              <CarIcon size={20} />
            </div>
          )
        default:
          return (
            <div className={`${iconClass} bg-gray-50 text-gray-600 dark:bg-gray-950/30 dark:text-gray-400`}>
              <BellIcon size={20} />
            </div>
          )
      }
    }

    return (
      <div 
        className="w-full py-4 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/30 rounded-lg px-2 transition-colors"
        onClick={handleNavigate}
      >
        <div className="flex gap-3">
          {/* Selection checkbox */}
          <div className="flex items-start pt-1">
            <Checkbox
              checked={selectedNotifications.has(notification.id)}
              onCheckedChange={(checked) => handleSelectNotification(notification.id, checked)}
              onClick={(e) => e.stopPropagation()}
              className="h-3 w-3"
            />
          </div>

          {/* Notification icon instead of avatar */}
          {renderNotificationIcon()}

          <div className="flex flex-1 flex-col space-y-2">
            <div className="w-full items-start">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{notification.user.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      {notification.action}{" "}
                    </span>
                    {notification.target && (
                      <span className="font-medium text-primary">{notification.target}</span>
                    )}
                  </div>
                  {!notification.isRead && (
                    <div className="size-1.5 rounded-full bg-emerald-500"></div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {notification.timestamp}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {notification.timeAgo}
                  </div>
                </div>
              </div>
            </div>

            {notification.content && (
              <div className="rounded-lg bg-muted p-2.5 text-sm tracking-[-0.006em]">
                {notification.content}
              </div>
            )}

            {notification.hasActions && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Odbaci
                </Button>
                <Button size="sm" className="h-7 text-xs">
                  Prihvati
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed z-50"
        style={{
          top: position.top,
          bottom: position.bottom,
          left: position.left,
          right: position.right,
          width: position.right ? 'auto' : '520px',
          maxHeight: '700px',
        }}
      >
        <Card className="flex w-full max-w-[520px] flex-col gap-6 p-4 shadow-2xl md:p-8">
          <CardHeader className="p-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base leading-none font-semibold tracking-[-0.006em]">
                Vaše notifikacije
              </h3>
              <div className="flex items-center gap-2">
                {/* Mark all as read button */}
                {activeTab === 'nove' && unreadNotifications.length > 0 && (
                  <Button className="size-8" variant="ghost" size="icon" onClick={handleMarkAllAsRead}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="1em"
                      height="1em"
                      viewBox="0 0 24 24"
                      className="size-4.5 text-muted-foreground"
                    >
                      <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M15.493 6.935a.75.75 0 0 1 .072 1.058l-7.857 9a.75.75 0 0 1-1.13 0l-3.143-3.6a.75.75 0 0 1 1.13-.986l2.578 2.953l7.292-8.353a.75.75 0 0 1 1.058-.072m5.025.085c.3.285.311.76.025 1.06l-8.571 9a.75.75 0 0 1-1.14-.063l-.429-.563a.75.75 0 0 1 1.076-1.032l7.978-8.377a.75.75 0 0 1 1.06-.026"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Button>
                )}
                
                {/* Selected actions button */}
                {selectedNotifications.size > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleMarkSelectedAsRead}
                    className="h-7 text-xs"
                  >
                    Označi ({selectedNotifications.size})
                  </Button>
                )}

                {/* Close button */}
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <CloseIcon size={16} />
                </Button>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full flex-col justify-start"
            >
              <div className="flex items-center justify-between">
                <TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 [&_button]:gap-1.5">
                  <TabsTrigger value="nove">
                    Nove
                    <Badge variant="secondary">{unreadNotifications.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="procitane">
                    Pročitane <Badge variant="secondary">{readNotifications.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="work-orders">
                    Radni nalozi <Badge variant="secondary">{workOrderCount}</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Selection controls */}
              {filteredNotifications.length > 0 && (
                <div className="flex items-center justify-between mt-4 p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={filteredNotifications.length > 0 && selectedNotifications.size === filteredNotifications.length}
                      onCheckedChange={handleSelectAll}
                      className="h-3 w-3"
                    />
                    <label htmlFor="select-all" className="text-xs text-muted-foreground">
                      Izaberi sve ({filteredNotifications.length})
                    </label>
                  </div>
                </div>
              )}
            </Tabs>
          </CardHeader>

          <CardContent className="h-full p-0 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-dashed divide-border">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2.5 py-12 text-center">
                    <div className="rounded-full bg-muted p-4">
                      <BellIcon size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium tracking-[-0.006em] text-muted-foreground">
                      {activeTab === 'nove' ? 'Nema novih notifikacija' : 
                       activeTab === 'procitane' ? 'Nema pročitanih notifikacija' :
                       'Nema notifikacija u ovoj kategoriji'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

export default NotificationWindow