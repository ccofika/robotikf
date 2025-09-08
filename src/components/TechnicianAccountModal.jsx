import React, { useState, useContext, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Camera, Save } from 'lucide-react'
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { AuthContext } from '../context/AuthContext'
import { techniciansAPI } from '../services/api'
import { toast } from '../utils/toast'

const TechnicianAccountModal = ({ onClose }) => {
  const { user, updateUser } = useContext(AuthContext)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const getUserInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'T'
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Molimo izaberite validnu sliku!')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Slika ne sme biti veća od 5MB!')
      return
    }

    setUploading(true)
    
    try {
      // Upload to cloudinary through API
      const formDataToSend = new FormData()
      formDataToSend.append('image', file)
      formDataToSend.append('folder', 'profile_images')
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/technicians/upload-profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Update user profile with new image URL
        await techniciansAPI.update(user._id || user.id, { profileImage: data.url })
        updateUser({ ...user, profileImage: data.url })
        toast.success('Profilna slika je uspešno ažurirana!')
        onClose()
      } else {
        throw new Error(data.error || 'Greška pri upload-u slike')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Greška pri upload-u slike. Pokušajte ponovo.')
    } finally {
      setUploading(false)
    }
  }

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
        variants={modalVariants}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Moj nalog</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center">
            <div className="relative mb-6">
              <Avatar className="w-24 h-24 mb-4">
                {user?.profileImage ? (
                  <AvatarImage src={user.profileImage} alt={user.name} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getUserInitials(user?.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute -bottom-2 -right-2 p-3 rounded-full bg-white border-2 border-white shadow-lg hover:bg-slate-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
                ) : (
                  <Camera size={18} />
                )}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{user?.name}</h3>
              <p className="text-sm text-slate-600 mb-4">Tehničar</p>
              <p className="text-sm text-slate-600 text-center">
                Kliknite na kameru da promenite profilnu sliku
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-center pt-6 border-t border-slate-200 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={uploading}
            >
              Zatvori
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default TechnicianAccountModal