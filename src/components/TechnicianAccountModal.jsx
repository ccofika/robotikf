import React, { useState, useContext, useRef } from 'react'
import { Camera } from 'lucide-react'
import Dialog from '../security/sx/Dialog'
import { Btn } from '../security/sx/ui'
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

  // Izgled Security dela: dijalog sa slikom profila i dugmetom za promenu
  return (
    <Dialog onClose={onClose} busy={uploading} eyebrow="Nalog" title="Moj nalog" size="sm" testId="account-modal"
      footer={<Btn variant="ghost" onClick={onClose} disabled={uploading}>Zatvori</Btn>}>
      <div className="mx-account__photo">
        <span className="mx-account__avatar is-lg">
          {user?.profileImage ? <img src={user.profileImage} alt={user.name} /> : <span>{getUserInitials(user?.name)}</span>}
        </span>
        <b className="mx-account__name">{user?.name}</b>
        <span className="sx-muted">Tehničar</span>
        <Btn size="sm" icon={Camera} onClick={() => fileInputRef.current?.click()} busy={uploading} disabled={uploading}>Promeni sliku</Btn>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
        <p className="sx-field__hint">Kliknite na kameru da promenite profilnu sliku</p>
      </div>
    </Dialog>
  )
}


export default TechnicianAccountModal