import React, { useContext, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronsUpDown, ChevronRight } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { cn } from "../../lib/utils"
import { AuthContext } from '../../context/AuthContext'
import {
  ChartIcon,
  BoxIcon,
  ToolsIcon,
  ClipboardIcon,
  HardHatIcon,
  UsersIcon,
  ExcelIcon,
  HistoryIcon,
  AlertTriangleIcon,
  CarIcon,
  DollarSignIcon,
  LogoutIcon,
  UserIcon,
  BellIcon
} from '../icons/SvgIcons'
import AccountModal from '../AccountModal'
import TechnicianAccountModal from '../TechnicianAccountModal'
import NotificationWindow from '../NotificationWindow'
import api from '../../services/api'

interface SidebarProps {
  className?: string
}

// Animation variants
const sidebarVariants = {
  open: {
    width: 256,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  closed: {
    width: 64,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
}

const staggerVariants = {
  open: {
    transition: {
      staggerChildren: 0.05,
    },
  },
  closed: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
}

const variants = {
  open: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      delay: 0.2, // Delay text appearance until sidebar expansion is mostly complete
    },
  },
  closed: {
    opacity: 0,
    x: -10,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      delay: 0, // No delay when closing
    },
  },
}

const iconVariants = {
  open: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 1,
    scale: 1,
  },
}

const transitionProps = {
  type: "spring",
  stiffness: 300,
  damping: 30,
}

export function ShadcnSidebar({ className }: SidebarProps) {
  const { user, logout } = useContext(AuthContext)
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastFetchTime, setLastFetchTime] = useState(0)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch unread notification count using axios (so interceptor works)
  const fetchUnreadCount = async (force = false) => {
    if (!user) {
      console.log('🔔 fetchUnreadCount: No user found, skipping');
      return;
    }

    // Debounce: ne dozvoliti pozive češće od 5 sekundi osim ako nije force
    const now = Date.now();
    if (!force && now - lastFetchTime < 5000) {
      console.log('🔔 fetchUnreadCount: Debounced, skipping (last call was', now - lastFetchTime, 'ms ago)');
      return;
    }

    setLastFetchTime(now);
    console.log('🔔 fetchUnreadCount: Starting request for user:', user.name);

    try {
      const response = await api.get('/api/notifications/unread', {
        timeout: 10000 // 10 second timeout
      });

      console.log('🔔 fetchUnreadCount: Success, count:', response.data.unreadCount || 0);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('🔔 fetchUnreadCount: Error:', error.message);

      // Set count to 0 on error to prevent showing stale data
      setUnreadCount(0);

      // If error is 401, interceptor will handle token refresh automatically
      // For other errors, don't retry to prevent spam
    }
  }

  // Fetch notification count on initial load (using axios so interceptor works)
  useEffect(() => {
    if (user) {
      fetchUnreadCount(true) // Force on initial load
    }
  }, [user])

  // DISABLED: No automatic polling - notifications only refresh when user opens panel
  // useEffect(() => {
  //   if (!user) return
  //   const interval = setInterval(fetchUnreadCount, 30 * 60 * 1000) // 30 minutes
  //   return () => clearInterval(interval)
  // }, [user])

  const adminMenuItems = [
    { 
      title: "Dashboard", 
      href: "/", 
      icon: ChartIcon 
    },
    { 
      title: "Oprema", 
      href: "/equipment", 
      icon: BoxIcon 
    },
    {
      title: "Materijali",
      href: "/materials",
      icon: ToolsIcon
    },
    {
      title: "Osnovna oprema",
      href: "/basic-equipment",
      icon: BoxIcon
    },
    { 
      title: "Tehničari", 
      href: "/technicians", 
      icon: HardHatIcon 
    },
    { 
      title: "Radni nalozi", 
      href: "/work-orders", 
      icon: ClipboardIcon 
    },
    { 
      title: "Korisnici", 
      href: "/users", 
      icon: UsersIcon 
    },
    { 
      title: "Logovi", 
      href: "/logs", 
      icon: HistoryIcon 
    },
    { 
      title: "Vozni park", 
      href: "/vehicles", 
      icon: CarIcon 
    },
    { 
      title: "Neispravna oprema", 
      href: "/defective-equipment", 
      icon: AlertTriangleIcon 
    },
  ]

  const technicianMenuItems = [
    { 
      title: "Moji radni nalozi", 
      href: "/my-work-orders", 
      icon: ClipboardIcon 
    },
    { 
      title: "Moja oprema", 
      href: "/my-equipment", 
      icon: BoxIcon 
    },
    {
      title: "Moji materijali",
      href: "/my-materials",
      icon: ToolsIcon
    },
    {
      title: "Moja osnovna oprema",
      href: "/my-basic-equipment",
      icon: BoxIcon
    },
  ]

  // SuperAdmin ima sve admin stranice + dodatne opcije
  const superAdminMenuItems = [
    ...adminMenuItems,
    {
      title: "Export",
      href: "/export",
      icon: ExcelIcon
    },
    {
      title: "Finansije",
      href: "/finances",
      icon: DollarSignIcon
    },
  ]

  const menuItems = user?.role === 'superadmin' ? superAdminMenuItems : (user?.role === 'admin' ? adminMenuItems : technicianMenuItems)

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className="fixed top-4 left-4 z-50 p-1.5 rounded-md bg-background border shadow-md md:hidden"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden" 
            onClick={() => setMobileOpen(false)} 
          />
        )}

        {/* Mobile sidebar */}
        <motion.div
          className={cn(
            "fixed left-0 top-0 z-40 h-full w-64 border-r bg-background transform md:hidden",
            className
          )}
          initial={{ x: "-100%" }}
          animate={{ x: mobileOpen ? 0 : "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex h-full flex-col">
            {/* Mobile header */}
            <div className="flex h-16 items-center justify-between border-b px-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">TC</AvatarFallback>
                </Avatar>
                <span className="text-lg font-semibold">TelCo Manager</span>
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <ChevronRight size={20} className="rotate-180" />
              </button>
            </div>

            {/* Mobile navigation */}
            <ScrollArea className="flex-1 p-4">
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const IconComponent = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <IconComponent size={18} />
                      <span>{item.title}</span>
                    </Link>
                  )
                })}
              </nav>
            </ScrollArea>

            {/* Mobile notification section */}
            <div className="border-t p-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start mb-2 relative"
                onClick={() => {
                  // Refresh notifications only when user explicitly opens panel
                  if (!showNotifications) {
                    fetchUnreadCount(true); // Force refresh when user clicks
                  }
                  setShowNotifications(!showNotifications);
                }}
              >
                <BellIcon className="mr-3 h-4 w-4" />
                <span>Notifikacije</span>
                {unreadCount > 0 && (
                  <div className="absolute top-1 left-6 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </Button>
            </div>

            {/* Mobile user section */}
            <div className="border-t p-4">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Avatar className="h-6 w-6">
                      {user?.profileImage && (
                        <AvatarImage src={user.profileImage} alt={user.name} />
                      )}
                      <AvatarFallback className="text-xs">
                        {getUserInitials(user?.name || 'User')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start min-w-0 flex-1 ml-2">
                      <p className="text-sm font-medium truncate">{user?.name || 'Korisnik'}</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.role === 'admin' ? 'Administrator' : 'Tehničar'}
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setShowAccountModal(true)}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Moj nalog</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                    <LogoutIcon className="mr-2 h-4 w-4" />
                    <span>Odjavite se</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.div>
        
        {/* Mobile Notification Window */}
        <NotificationWindow
          isOpen={showNotifications}
          onClose={() => {
            setShowNotifications(false)
          }}
          position={{
            bottom: 20,
            left: 20,
            right: 20
          }}
          onNotificationUpdate={() => {
            // Decrement unread count locally instead of making API call
            setUnreadCount(prev => Math.max(0, prev - 1))
          }}
        />
      </>
    )
  }

  return (
    <motion.div
      className={cn("fixed left-0 z-40 h-full shrink-0 border-r bg-background", className)}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => {
        if (!showNotifications) {
          setIsCollapsed(true)
        }
      }}
    >
      <motion.div className="relative z-40 flex text-muted-foreground h-full shrink-0 flex-col bg-white dark:bg-background transition-all">
        <motion.div variants={staggerVariants} className="flex h-full flex-col">
          
          {/* Logo Section */}
          <div className="flex h-[54px] w-full shrink-0 border-b p-2">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-[38px] w-full flex items-center justify-center">
                  <Avatar className='rounded size-6'>
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">TC</AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <motion.div variants={variants} className="flex items-center justify-between w-full ml-2 overflow-hidden">
                      <p className="text-sm font-medium whitespace-nowrap">TelCo Manager</p>
                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50 ml-2 shrink-0" />
                    </motion.div>
                  )}
                </Button>
              </DropdownMenuTrigger>
            </DropdownMenu>
          </div>

          {/* Navigation Menu */}
          <div className="flex grow flex-col px-2 py-2">
            <div className="flex-1 w-full">
              <nav className={cn("space-y-1 flex flex-col", isCollapsed ? "items-center" : "")}>
                {menuItems.map((item, index) => {
                  const IconComponent = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <motion.li key={item.href} variants={iconVariants} className="list-none">
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center rounded-md text-sm font-medium transition-colors relative",
                          isCollapsed 
                            ? "justify-center w-[38px] h-[38px]" 
                            : "px-3 justify-start w-full h-[38px]",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        title={isCollapsed ? item.title : undefined}
                      >
                        <IconComponent size={18} className="shrink-0" />
                        {!isCollapsed && (
                          <motion.span 
                            variants={variants}
                            className="ml-3 whitespace-nowrap overflow-hidden"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </Link>
                    </motion.li>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Notification Section */}
          <div className="border-t p-2">
            <motion.li variants={iconVariants} className="list-none">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors relative",
                  isCollapsed 
                    ? "justify-center w-[38px] h-[38px]" 
                    : "px-3 justify-start w-full h-[38px]",
                  showNotifications
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  // Refresh notifications only when user explicitly opens panel
                  if (!showNotifications) {
                    fetchUnreadCount(true); // Force refresh when user clicks
                  }
                  setShowNotifications(!showNotifications);
                }}
                title={isCollapsed ? "Notifikacije" : undefined}
              >
                <BellIcon size={18} className="shrink-0" />
                {!isCollapsed && (
                  <motion.span 
                    variants={variants}
                    className="ml-3 whitespace-nowrap overflow-hidden"
                  >
                    Notifikacije
                  </motion.span>
                )}
                {/* Notification badge */}
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </Button>
            </motion.li>
          </div>

          {/* User Section */}
          <div className="border-t p-2">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-[38px] w-full flex items-center justify-center">
                  <Avatar className="h-6 w-6">
                    {user?.profileImage && (
                      <AvatarImage src={user.profileImage} alt={user.name} />
                    )}
                    <AvatarFallback className="text-xs">
                      {getUserInitials(user?.name || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <motion.div variants={variants} className="flex flex-col items-start min-w-0 flex-1 ml-2 overflow-hidden">
                      <p className="text-sm font-medium truncate whitespace-nowrap">{user?.name || 'Korisnik'}</p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {user?.role === 'admin' ? 'Administrator' : 'Tehničar'}
                      </p>
                    </motion.div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowAccountModal(true)}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Moj nalog</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  <LogoutIcon className="mr-2 h-4 w-4" />
                  <span>Odjavite se</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </motion.div>
      </motion.div>

      {/* Notification Window */}
      <NotificationWindow
        isOpen={showNotifications}
        onClose={() => {
          setShowNotifications(false)
          setIsCollapsed(true)
        }}
        position={{ 
          bottom: 20, 
          left: isCollapsed ? 64 : 256 
        }}
        onNotificationUpdate={() => {
          // Decrement unread count locally instead of making API call
          setUnreadCount(prev => Math.max(0, prev - 1))
        }}
      />

      {/* Account Modal */}
      {showAccountModal && user?.role === 'admin' && (
        <AccountModal onClose={() => setShowAccountModal(false)} />
      )}
      {showAccountModal && user?.role === 'technician' && (
        <TechnicianAccountModal onClose={() => setShowAccountModal(false)} />
      )}
    </motion.div>
  )
}