import React, { useState, useContext, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Camera, Lock, Mail, User, Save, Upload } from 'lucide-react'
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { AuthContext } from '../context/AuthContext'
import { techniciansAPI } from '../services/api'
import { toast } from '../utils/toast'

const AccountModal = ({ onClose }) => {
  const { user, updateUser } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    gmail: user?.gmail || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const getUserInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AD'
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
      // Convert file to base64 for upload
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.readAsDataURL(file)
      })

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updateData = {}

      // Update name if changed
      if (formData.name !== user.name) {
        updateData.name = formData.name
      }

      // Update email if changed
      if (formData.gmail !== (user.gmail || '')) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (formData.gmail && !emailRegex.test(formData.gmail)) {
          toast.error('Unesite validnu email adresu!')
          return
        }
        updateData.gmail = formData.gmail
      }

      // Update password if provided
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          toast.error('Lozinke se ne podudaraju!')
          return
        }
        
        if (formData.newPassword.length < 6) {
          toast.error('Lozinka mora imati najmanje 6 karaktera!')
          return
        }
        
        updateData.password = formData.newPassword
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('Nema promena za sačuvati.')
        return
      }

      // Send update request
      await techniciansAPI.update(user._id || user.id, updateData)
      
      // Update local user context
      const updatedUser = { ...user, ...updateData }
      delete updatedUser.password // Don't store password in context
      updateUser(updatedUser)
      
      toast.success('Profil je uspešno ažuriran!')
      onClose()
    } catch (error) {
      console.error('Error updating profile:', error)
      const errorMessage = error.response?.data?.error || 'Greška pri ažuriranju profila.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
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
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
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
        <form onSubmit={handleSubmit} className="p-6">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <Avatar className="w-20 h-20 mb-4">
                {user?.profileImage ? (
                  <AvatarImage src={user.profileImage} alt={user.name} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {getUserInitials(user?.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute -bottom-2 -right-2 p-2 rounded-full bg-white border-2 border-white shadow-lg hover:bg-slate-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                ) : (
                  <Camera size={16} />
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
            
            <p className="text-sm text-slate-600 text-center">
              Kliknite na kameru da promenite profilnu sliku
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <User size={16} className="inline mr-2" />
                Ime i prezime
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Unesite ime i prezime"
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Mail size={16} className="inline mr-2" />
                Email adresa
              </label>
              <input
                type="email"
                value={formData.gmail}
                onChange={(e) => handleInputChange('gmail', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ime@gmail.com"
              />
            </div>

            {/* Password Section */}
            <div className="border-t border-slate-200 pt-4 mt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                <Lock size={16} className="inline mr-2" />
                Promena lozinke
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nova lozinka (neobavezno)
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ostavite prazno ako ne želite da menjate"
                  />
                </div>
                
                {formData.newPassword && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Potvrdite lozinku
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Potvrdite novu lozinku"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Odustani
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Čuva...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save size={16} className="mr-2" />
                  Sačuvaj
                </div>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default AccountModal