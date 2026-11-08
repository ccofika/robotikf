import React, { useState, useContext, useRef } from 'react'
import { Camera, Save } from 'lucide-react'
import Dialog from '../security/sx/Dialog'
import { Btn } from '../security/sx/ui'
import { Field, Input } from '../security/sx/forms'
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

  // Izgled Security dela: dijalog sa natpisom, poljima i podnožjem (Odustani / Sačuvaj)
  return (
    <Dialog onClose={onClose} busy={loading} eyebrow="Nalog" title="Moj nalog" size="md" testId="account-modal"
      footer={<>
        <Btn variant="ghost" onClick={onClose} disabled={loading}>Odustani</Btn>
        <Btn variant="primary" type="submit" form="mx-account-form" icon={Save} busy={loading}>{loading ? 'Čuva...' : 'Sačuvaj'}</Btn>
      </>}>
      <form id="mx-account-form" onSubmit={handleSubmit}>
        <div className="mx-account__photo">
          <span className="mx-account__avatar">
            {user?.profileImage ? <img src={user.profileImage} alt={user.name} /> : <span>{getUserInitials(user?.name)}</span>}
          </span>
          <Btn size="sm" icon={Camera} onClick={() => fileInputRef.current?.click()} busy={uploading} disabled={uploading}>Promeni sliku</Btn>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
          <p className="sx-field__hint">Kliknite na kameru da promenite profilnu sliku</p>
        </div>

        <div className="sx-fieldset">
          <Field label="Ime i prezime" htmlFor="mx-acc-name">
            <Input id="mx-acc-name" type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Unesite ime i prezime" required />
          </Field>
          <Field label="Email adresa" htmlFor="mx-acc-mail">
            <Input id="mx-acc-mail" type="email" value={formData.gmail} onChange={(e) => handleInputChange('gmail', e.target.value)} placeholder="ime@gmail.com" />
          </Field>
        </div>

        <div className="sx-fieldset">
          <h3 className="sx-fieldset__title">Promena lozinke</h3>
          <Field label="Nova lozinka (neobavezno)" htmlFor="mx-acc-pass">
            <Input id="mx-acc-pass" type="password" value={formData.newPassword} onChange={(e) => handleInputChange('newPassword', e.target.value)} placeholder="Ostavite prazno ako ne želite da menjate" />
          </Field>
          {formData.newPassword && (
            <Field label="Potvrdite lozinku" htmlFor="mx-acc-pass2">
              <Input id="mx-acc-pass2" type="password" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} placeholder="Potvrdite novu lozinku" required />
            </Field>
          )}
        </div>
      </form>
    </Dialog>
  )
}

export default AccountModal
